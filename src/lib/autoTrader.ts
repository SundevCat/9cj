// Auto-trader — server-side. Runs on the SSE pulse (every 5s) and trades
// XAU/USD via Capital.com when RSI + MACD + EMA all agree on a direction.
//
// Safety:
//   - Every order routes through routeAction() so MAX_TRADE_SIZE and
//     DAILY_LOSS policies can block / queue for HIL approval
//   - One open auto-trade at a time; flips on opposite consensus
//   - Cooldown between actions to prevent whipsaw on noisy ticks
//   - Idempotent: state lives in DB, not memory — a crashed pulse resumes
//     cleanly on the next tick

import { prisma } from "./prisma";
import { getSetting, setSetting } from "./setting";
import { fetchSpotXAU } from "./goldApi";
import { computeAll } from "./indicators";
import { routeAction } from "./router";
import { recordMemory } from "./memory";
import { placeOrder, closeTrade, currentBroker, BrokerUnavailableError } from "./broker";
import { CapitalPositionNotFoundError } from "./capital";

// ── Types ────────────────────────────────────────────────────────────────────

export type Strategy = "CONSENSUS" | "MAJORITY_2OF3";

export const STRATEGIES: { id: Strategy; label: string; desc: string }[] = [
  { id: "CONSENSUS",     label: "Consensus (3/3)",  desc: "All RSI + MACD + EMA must agree. Strict; few trades/day." },
  { id: "MAJORITY_2OF3", label: "Majority (2/3)",   desc: "Any 2 of 3 agree (no opposing 3rd). Moderate; more trades." },
];

export type Config = {
  enabled: boolean;
  strategy: Strategy;
  size: number;            // contracts (Capital GOLD CFD = 100 oz / contract)
  stopLossPct: number | null;   // % from entry, null = no SL
  takeProfitPct: number | null; // % from entry, null = no TP
  cooldownSec: number;     // min seconds between actions
};

export type State = {
  lastActionAt: string | null;
  openTradeId: number | null;
  lastDirection: "LONG" | "SHORT" | null;
  lastDecision: string | null;
};

export type TickResult = {
  action: "NONE" | "OPEN" | "FLIP" | "HOLD" | "QUEUED" | "ERROR";
  detail: string;
  consensus?: "BUY" | "SELL" | "NEUTRAL";
};

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Config = {
  enabled: false,
  strategy: "CONSENSUS",
  size: 0.1,
  stopLossPct: null,
  takeProfitPct: null,
  cooldownSec: 30,
};

// ── Config / state I/O (Setting table) ───────────────────────────────────────

function key(k: string) { return `autotrader.${k}`; }

export async function getConfig(): Promise<Config> {
  const [enabled, strategy, size, slPct, tpPct, cooldown] = await Promise.all([
    getSetting(key("enabled"), String(DEFAULT_CONFIG.enabled)),
    getSetting(key("strategy"), DEFAULT_CONFIG.strategy),
    getSetting(key("size"), String(DEFAULT_CONFIG.size)),
    getSetting(key("stopLossPct"), ""),
    getSetting(key("takeProfitPct"), ""),
    getSetting(key("cooldownSec"), String(DEFAULT_CONFIG.cooldownSec)),
  ]);
  return {
    enabled: enabled === "true",
    strategy: (strategy as Strategy) ?? DEFAULT_CONFIG.strategy,
    size: Number(size) || DEFAULT_CONFIG.size,
    stopLossPct: slPct ? Number(slPct) : null,
    takeProfitPct: tpPct ? Number(tpPct) : null,
    cooldownSec: Number(cooldown) || DEFAULT_CONFIG.cooldownSec,
  };
}

export async function setConfig(patch: Partial<Config>): Promise<Config> {
  const current = await getConfig();
  const next = { ...current, ...patch };
  await Promise.all([
    setSetting(key("enabled"), String(next.enabled)),
    setSetting(key("strategy"), next.strategy),
    setSetting(key("size"), String(next.size)),
    setSetting(key("stopLossPct"), next.stopLossPct === null ? "" : String(next.stopLossPct)),
    setSetting(key("takeProfitPct"), next.takeProfitPct === null ? "" : String(next.takeProfitPct)),
    setSetting(key("cooldownSec"), String(next.cooldownSec)),
  ]);
  return next;
}

export async function getState(): Promise<State> {
  const [lastActionAt, openTradeIdRaw, lastDirection, lastDecision] = await Promise.all([
    getSetting(key("state.lastActionAt"), ""),
    getSetting(key("state.openTradeId"), ""),
    getSetting(key("state.lastDirection"), ""),
    getSetting(key("state.lastDecision"), ""),
  ]);
  return {
    lastActionAt: lastActionAt || null,
    openTradeId: openTradeIdRaw ? Number(openTradeIdRaw) : null,
    lastDirection: (lastDirection as "LONG" | "SHORT") || null,
    lastDecision: lastDecision || null,
  };
}

async function setState(patch: Partial<State>): Promise<void> {
  const current = await getState();
  const next = { ...current, ...patch };
  await Promise.all([
    setSetting(key("state.lastActionAt"), next.lastActionAt ?? ""),
    setSetting(key("state.openTradeId"), next.openTradeId === null ? "" : String(next.openTradeId)),
    setSetting(key("state.lastDirection"), next.lastDirection ?? ""),
    setSetting(key("state.lastDecision"), next.lastDecision ?? ""),
  ]);
}

// ── Decision logic ───────────────────────────────────────────────────────────

export function deriveSignal(
  strategy: Strategy,
  rsi: string,
  macd: string,
  ema: string
): "BUY" | "SELL" | "NEUTRAL" {
  if (strategy === "CONSENSUS") {
    if (rsi === "BUY" && macd === "BUY" && ema === "BUY") return "BUY";
    if (rsi === "SELL" && macd === "SELL" && ema === "SELL") return "SELL";
    return "NEUTRAL";
  }
  // MAJORITY_2OF3 — count votes per side; need at least 2 BUY and 0 SELL (or vice versa)
  const votes = [rsi, macd, ema];
  const buys = votes.filter((v) => v === "BUY").length;
  const sells = votes.filter((v) => v === "SELL").length;
  if (buys >= 2 && sells === 0) return "BUY";
  if (sells >= 2 && buys === 0) return "SELL";
  return "NEUTRAL";
}

// SL/TP math — direction-aware. SHORT looks counter-intuitive but is correct:
// SHORT profits when price drops, so TP must sit BELOW entry; SL ABOVE entry.
// Quick reference:
//
//   Direction | Profit when    | SL (loss side)         | TP (profit side)
//   ----------+----------------+------------------------+------------------------
//   LONG      | price ↑         | entry × (1 − slPct/100) | entry × (1 + tpPct/100)
//   SHORT     | price ↓         | entry × (1 + slPct/100) | entry × (1 − tpPct/100)
//
// In both cases SL and TP sit on opposite sides of entry by design.
function computeSL(entry: number, direction: "LONG" | "SHORT", pct: number | null): number | undefined {
  if (pct === null || pct <= 0) return undefined;
  return direction === "LONG"
    ? Number((entry * (1 - pct / 100)).toFixed(2))   // LONG SL = below entry (cuts loss)
    : Number((entry * (1 + pct / 100)).toFixed(2));  // SHORT SL = above entry (cuts loss)
}

function computeTP(entry: number, direction: "LONG" | "SHORT", pct: number | null): number | undefined {
  if (pct === null || pct <= 0) return undefined;
  return direction === "LONG"
    ? Number((entry * (1 + pct / 100)).toFixed(2))   // LONG TP = above entry (locks profit)
    : Number((entry * (1 - pct / 100)).toFixed(2));  // SHORT TP = below entry (locks profit)
}

// Open a live position via routeAction → placeOrder.
// Returns the new Trade.id on success, or null if queued / blocked.
async function openLivePosition(
  direction: "LONG" | "SHORT",
  size: number,
  config: Config
): Promise<{ tradeId: number | null; detail: string; queued: boolean }> {
  // Get current spot for SL/TP calc + entry seed
  const spot = await fetchSpotXAU();
  const entryHint = spot.price;
  const stopLossPrice = computeSL(entryHint, direction, config.stopLossPct);
  const takeProfitPrice = computeTP(entryHint, direction, config.takeProfitPct);

  // Policy check first
  const route = await routeAction({
    module: "xau",
    action: "open_trade",
    size,
    description: `autotrader CONSENSUS · ${direction} ${size} ≈ ${entryHint}`,
    raw: { direction, entryHint, stopLossPrice, takeProfitPrice, source: "autotrader" },
  });
  if (route.decision === "QUEUED_FOR_APPROVAL") {
    return { tradeId: null, detail: `queued for HIL · task ${route.taskId}`, queued: true };
  }

  // Place real order via Capital
  const units = direction === "LONG" ? size : -size;
  const result = await placeOrder({
    instrument: "XAU_USD",
    units,
    stopLossPrice,
    takeProfitPrice,
    clientComment: `autotrader CONSENSUS ${direction}`,
  });

  const trade = await prisma.trade.create({
    data: {
      direction,
      entry: result.fillPrice ?? entryHint,
      size,
      status: "OPEN",
      isLive: true,
      instrument: "XAU_USD",
      brokerOrderId: result.orderId,
      brokerDealId: result.tradeId ?? null,
      fillPrice: result.fillPrice ?? null,
      stopLoss: stopLossPrice ?? null,
      takeProfit: takeProfitPrice ?? null,
      notes: "autotrader:CONSENSUS",
    },
  });

  await recordMemory(
    "autotrader",
    "TRADE",
    `OPEN ${direction} ${size} @ ${result.fillPrice ?? entryHint} · order ${result.orderId}`,
    { tradeId: trade.id, direction, size, fillPrice: result.fillPrice, sl: stopLossPrice, tp: takeProfitPrice }
  );

  return { tradeId: trade.id, detail: `opened ${direction} @ ${result.fillPrice ?? entryHint}`, queued: false };
}

// Close a live position via broker.closeTrade and update local Trade row.
async function closeLivePosition(tradeId: number): Promise<{ closePrice: number; pnl: number }> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || !trade.brokerDealId) throw new Error(`trade ${tradeId} not closeable`);

  let result: { closePrice: number; realizedPL: number };
  try {
    result = await closeTrade(trade.brokerDealId);
  } catch (e) {
    if (e instanceof CapitalPositionNotFoundError) {
      // Broker has nothing matching — clear local state so flip can proceed
      await prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: "CLOSED",
          exit: trade.exit ?? trade.entry,
          notes: (trade.notes ?? "") + " · closed locally (broker had no matching position)",
        },
      });
      await recordMemory(
        "autotrader",
        "WARN",
        `closed locally · ${trade.direction} ${trade.size} · ${e.message}`,
        { tradeId, reason: e.message }
      );
      return { closePrice: trade.entry, pnl: 0 };
    }
    throw e;
  }
  const pnl = Number(result.realizedPL.toFixed(2));

  await prisma.trade.update({
    where: { id: tradeId },
    data: {
      exit: result.closePrice,
      fillPrice: result.closePrice,
      pnl,
      status: "CLOSED",
    },
  });

  await recordMemory(
    "autotrader",
    "TRADE",
    `CLOSE ${trade.direction} @ ${result.closePrice} · PnL ${pnl >= 0 ? "+" : ""}${pnl}`,
    { tradeId, closePrice: result.closePrice, pnl }
  );

  return { closePrice: result.closePrice, pnl };
}

// ── Main loop entry — called from SSE pulse ──────────────────────────────────

export async function tick(): Promise<TickResult> {
  const config = await getConfig();
  if (!config.enabled) return { action: "NONE", detail: "disabled" };

  const broker = currentBroker();
  if (!broker.configured) {
    return { action: "ERROR", detail: `broker not configured: ${broker.envHint ?? "n/a"}` };
  }

  const state = await getState();

  // Cooldown gate
  if (state.lastActionAt) {
    const elapsed = (Date.now() - new Date(state.lastActionAt).getTime()) / 1000;
    if (elapsed < config.cooldownSec) {
      return { action: "HOLD", detail: `cooldown · ${(config.cooldownSec - elapsed).toFixed(0)}s left` };
    }
  }

  // Pull candles + compute signals
  const rows = await prisma.price.findMany({
    orderBy: { timestamp: "desc" },
    take: 250,
  });
  if (rows.length < 50) {
    return { action: "HOLD", detail: `not enough candles (${rows.length}/50)` };
  }
  const closes = rows.map((r) => r.close).reverse();
  const signals = computeAll(closes);

  const consensus = deriveSignal(config.strategy, signals.rsi.signal, signals.macd.trend, signals.ema.signal);

  // No actionable signal → nothing to do (but remember the decision for the UI)
  if (consensus === "NEUTRAL") {
    const detail = `no ${config.strategy.toLowerCase()} signal · rsi=${signals.rsi.signal} macd=${signals.macd.trend} ema=${signals.ema.signal}`;
    await setState({ lastDecision: detail });
    return { action: "HOLD", detail, consensus };
  }

  const wantDirection: "LONG" | "SHORT" = consensus === "BUY" ? "LONG" : "SHORT";

  // Resolve current open auto-trade (verify it still exists + isn't closed)
  let openTrade: { id: number; direction: string; status: string } | null = null;
  if (state.openTradeId) {
    openTrade = await prisma.trade.findUnique({
      where: { id: state.openTradeId },
      select: { id: true, direction: true, status: true },
    });
    if (!openTrade || openTrade.status !== "OPEN") {
      // Stale pointer (closed externally, e.g. SL/TP hit) — clear it
      openTrade = null;
      await setState({ openTradeId: null, lastDirection: null });
    }
  }

  try {
    // No open trade + actionable consensus → open
    if (!openTrade) {
      const opened = await openLivePosition(wantDirection, config.size, config);
      const detail = opened.detail;
      await setState({
        lastActionAt: new Date().toISOString(),
        openTradeId: opened.tradeId,
        lastDirection: opened.tradeId ? wantDirection : state.lastDirection,
        lastDecision: detail,
      });
      return { action: opened.queued ? "QUEUED" : "OPEN", detail, consensus };
    }

    // Open trade matches consensus → hold
    if (openTrade.direction === wantDirection) {
      const detail = `consensus matches open ${wantDirection} · holding`;
      await setState({ lastDecision: detail });
      return { action: "HOLD", detail, consensus };
    }

    // Open trade opposes consensus → flip
    const closed = await closeLivePosition(openTrade.id);
    const opened = await openLivePosition(wantDirection, config.size, config);
    const detail = `flipped · closed ${openTrade.direction} @ ${closed.closePrice} (PnL ${closed.pnl >= 0 ? "+" : ""}${closed.pnl}) → ${opened.detail}`;
    await setState({
      lastActionAt: new Date().toISOString(),
      openTradeId: opened.tradeId,
      lastDirection: opened.tradeId ? wantDirection : null,
      lastDecision: detail,
    });
    return { action: opened.queued ? "QUEUED" : "FLIP", detail, consensus };
  } catch (e) {
    const reason = e instanceof BrokerUnavailableError ? e.message : (e as Error).message;
    const detail = `tick error: ${reason}`;
    await recordMemory("autotrader", "ERR", detail, { consensus, error: reason });
    await setState({ lastDecision: detail });
    return { action: "ERROR", detail, consensus };
  }
}

// ── Manual trigger — bypasses signal + cooldown, still respects policy ──────
// Used by the "Trade now" button. Lets the user verify the full pipeline in
// one click without waiting for a signal to fire.

export async function triggerManual(direction: "LONG" | "SHORT"): Promise<TickResult> {
  const config = await getConfig();
  const broker = currentBroker();
  if (!broker.configured) {
    return { action: "ERROR", detail: `broker not configured: ${broker.envHint ?? "n/a"}` };
  }

  const state = await getState();

  // Resolve current open auto-trade
  let openTrade: { id: number; direction: string; status: string } | null = null;
  if (state.openTradeId) {
    openTrade = await prisma.trade.findUnique({
      where: { id: state.openTradeId },
      select: { id: true, direction: true, status: true },
    });
    if (!openTrade || openTrade.status !== "OPEN") {
      openTrade = null;
      await setState({ openTradeId: null, lastDirection: null });
    }
  }

  try {
    // Already in the requested direction — refuse to stack
    if (openTrade && openTrade.direction === direction) {
      const detail = `manual trigger ignored · already holding ${direction}`;
      await setState({ lastDecision: detail });
      return { action: "HOLD", detail };
    }

    // Opposite direction open → flip
    if (openTrade && openTrade.direction !== direction) {
      const closed = await closeLivePosition(openTrade.id);
      const opened = await openLivePosition(direction, config.size, config);
      const detail = `manual flip · closed ${openTrade.direction} @ ${closed.closePrice} (PnL ${closed.pnl >= 0 ? "+" : ""}${closed.pnl}) → ${opened.detail}`;
      await setState({
        lastActionAt: new Date().toISOString(),
        openTradeId: opened.tradeId,
        lastDirection: opened.tradeId ? direction : null,
        lastDecision: detail,
      });
      await recordMemory("autotrader", "AI", `manual trigger · flip → ${direction}`, { direction, size: config.size });
      return { action: opened.queued ? "QUEUED" : "FLIP", detail };
    }

    // No open → just open new
    const opened = await openLivePosition(direction, config.size, config);
    const detail = `manual trigger · ${opened.detail}`;
    await setState({
      lastActionAt: new Date().toISOString(),
      openTradeId: opened.tradeId,
      lastDirection: opened.tradeId ? direction : state.lastDirection,
      lastDecision: detail,
    });
    await recordMemory("autotrader", "AI", `manual trigger · open ${direction}`, { direction, size: config.size });
    return { action: opened.queued ? "QUEUED" : "OPEN", detail };
  } catch (e) {
    const reason = e instanceof BrokerUnavailableError ? e.message : (e as Error).message;
    const detail = `manual trigger error: ${reason}`;
    await recordMemory("autotrader", "ERR", detail, { direction, error: reason });
    await setState({ lastDecision: detail });
    return { action: "ERROR", detail };
  }
}

// ── Read-only preview — what would tick() do RIGHT NOW? ─────────────────────
// Used by the Bot Brain panel. Mirrors tick() decision tree but has zero
// side effects (no setState, no recordMemory, no broker calls, no Trade rows).

export type AutotraderStatus = {
  config: Config;
  state: State;
  cooldownRemaining: number;          // seconds; 0 if not in cooldown
  candleCount: number;
  signals: {
    rsi: { value: number | null; signal: "BUY" | "SELL" | "NEUTRAL"; period: number };
    macd: { macd: number | null; signal: number | null; histogram: number | null; trend: "BUY" | "SELL" | "NEUTRAL" };
    ema: { ema50: number | null; ema200: number | null; signal: "BUY" | "SELL" | "NEUTRAL" };
  } | null;
  votes: { buy: number; sell: number; neutral: number };
  verdict: "BUY" | "SELL" | "NEUTRAL";
  verdictReason: string;
  openTradeId: number | null;
  openTradeDirection: "LONG" | "SHORT" | null;
  nextAction: {
    action: TickResult["action"];
    detail: string;
  };
  asOf: string;
};

export async function previewTick(): Promise<AutotraderStatus> {
  const config = await getConfig();
  const state = await getState();
  const now = Date.now();

  // Cooldown remaining
  let cooldownRemaining = 0;
  if (state.lastActionAt) {
    const elapsed = (now - new Date(state.lastActionAt).getTime()) / 1000;
    cooldownRemaining = Math.max(0, Math.ceil(config.cooldownSec - elapsed));
  }

  // Pull candles
  const rows = await prisma.price.findMany({
    orderBy: { timestamp: "desc" },
    take: 250,
  });
  const candleCount = rows.length;

  // Default empty-state response
  let signals: AutotraderStatus["signals"] = null;
  let verdict: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  let votes = { buy: 0, sell: 0, neutral: 0 };
  let verdictReason = "no signals";

  if (candleCount >= 50) {
    const closes = rows.map((r) => r.close).reverse();
    const bundle = computeAll(closes);
    signals = {
      rsi: bundle.rsi,
      macd: bundle.macd,
      ema: bundle.ema,
    };
    const votesArr = [bundle.rsi.signal, bundle.macd.trend, bundle.ema.signal];
    votes = {
      buy: votesArr.filter((v) => v === "BUY").length,
      sell: votesArr.filter((v) => v === "SELL").length,
      neutral: votesArr.filter((v) => v === "NEUTRAL").length,
    };
    verdict = deriveSignal(config.strategy, bundle.rsi.signal, bundle.macd.trend, bundle.ema.signal);
    if (config.strategy === "CONSENSUS") {
      verdictReason = verdict !== "NEUTRAL"
        ? `3/3 ${verdict} (CONSENSUS satisfied)`
        : `${votes.buy} BUY / ${votes.sell} SELL / ${votes.neutral} NEUTRAL — CONSENSUS needs 3/3 same`;
    } else {
      verdictReason = verdict !== "NEUTRAL"
        ? `${verdict === "BUY" ? votes.buy : votes.sell}/3 ${verdict} (MAJORITY 2/3 satisfied · no opposing)`
        : `${votes.buy} BUY / ${votes.sell} SELL / ${votes.neutral} NEUTRAL — MAJORITY needs ≥2 same with 0 opposing`;
    }
  }

  // Resolve open trade (only autotrader's own)
  let openTradeDirection: "LONG" | "SHORT" | null = null;
  if (state.openTradeId) {
    const t = await prisma.trade.findUnique({
      where: { id: state.openTradeId },
      select: { direction: true, status: true },
    });
    if (t?.status === "OPEN") openTradeDirection = t.direction as "LONG" | "SHORT";
  }

  // Compute next action — same branches as tick() but no side effects
  let nextAction: AutotraderStatus["nextAction"];
  if (!config.enabled) {
    nextAction = { action: "NONE", detail: "disabled" };
  } else if (candleCount < 50) {
    nextAction = { action: "HOLD", detail: `not enough candles (${candleCount}/50)` };
  } else if (cooldownRemaining > 0) {
    nextAction = { action: "HOLD", detail: `cooldown · ${cooldownRemaining}s left` };
  } else if (verdict === "NEUTRAL") {
    nextAction = { action: "HOLD", detail: verdictReason };
  } else {
    const wantDir: "LONG" | "SHORT" = verdict === "BUY" ? "LONG" : "SHORT";
    if (!openTradeDirection) {
      nextAction = { action: "OPEN", detail: `would OPEN ${wantDir} · size ${config.size}` };
    } else if (openTradeDirection === wantDir) {
      nextAction = { action: "HOLD", detail: `matches open ${wantDir} · would hold` };
    } else {
      nextAction = { action: "FLIP", detail: `would FLIP ${openTradeDirection}→${wantDir} · size ${config.size}` };
    }
  }

  return {
    config,
    state,
    cooldownRemaining,
    candleCount,
    signals,
    votes,
    verdict,
    verdictReason,
    openTradeId: state.openTradeId,
    openTradeDirection,
    nextAction,
    asOf: new Date().toISOString(),
  };
}
