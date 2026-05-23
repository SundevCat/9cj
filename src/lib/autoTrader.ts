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

// ── Types ────────────────────────────────────────────────────────────────────

export type Strategy = "CONSENSUS";

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

function deriveConsensus(rsi: string, macd: string, ema: string): "BUY" | "SELL" | "NEUTRAL" {
  if (rsi === "BUY" && macd === "BUY" && ema === "BUY") return "BUY";
  if (rsi === "SELL" && macd === "SELL" && ema === "SELL") return "SELL";
  return "NEUTRAL";
}

function computeSL(entry: number, direction: "LONG" | "SHORT", pct: number | null): number | undefined {
  if (pct === null || pct <= 0) return undefined;
  return direction === "LONG"
    ? Number((entry * (1 - pct / 100)).toFixed(2))
    : Number((entry * (1 + pct / 100)).toFixed(2));
}

function computeTP(entry: number, direction: "LONG" | "SHORT", pct: number | null): number | undefined {
  if (pct === null || pct <= 0) return undefined;
  return direction === "LONG"
    ? Number((entry * (1 + pct / 100)).toFixed(2))
    : Number((entry * (1 - pct / 100)).toFixed(2));
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

  const result = await closeTrade(trade.brokerDealId);
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

  const consensus = deriveConsensus(signals.rsi.signal, signals.macd.trend, signals.ema.signal);

  // No consensus → nothing to do (but remember the decision for the UI)
  if (consensus === "NEUTRAL") {
    const detail = `no consensus · rsi=${signals.rsi.signal} macd=${signals.macd.trend} ema=${signals.ema.signal}`;
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
