import { RSI, MACD, EMA } from "technicalindicators";

export type Candle = {
  timestamp: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Strategy = "RSI" | "MACD" | "EMA_CROSS";

export type BacktestTrade = {
  entryTs: number;
  entryPrice: number;
  exitTs: number;
  exitPrice: number;
  direction: "LONG" | "SHORT";
  pnl: number;
  pnlPct: number;
};

export type BacktestStats = {
  trades: BacktestTrade[];
  totalTrades: number;
  winRate: number; // 0..1
  totalPnL: number;
  totalPnLPct: number;
  sharpe: number;
  maxDrawdown: number; // negative number, e.g. -0.087
  equityCurve: { ts: number; equity: number }[];
};

function rsiSignals(closes: number[], period = 14, lo = 30, hi = 70): ("BUY" | "SELL" | null)[] {
  const out = RSI.calculate({ values: closes, period });
  // Align with closes; RSI output starts at index `period`
  const pad = closes.length - out.length;
  const sigs: ("BUY" | "SELL" | null)[] = new Array(closes.length).fill(null);
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    if (prev < lo && cur >= lo) sigs[pad + i] = "BUY";
    else if (prev > hi && cur <= hi) sigs[pad + i] = "SELL";
  }
  return sigs;
}

function macdSignals(closes: number[]): ("BUY" | "SELL" | null)[] {
  const out = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const pad = closes.length - out.length;
  const sigs: ("BUY" | "SELL" | null)[] = new Array(closes.length).fill(null);
  for (let i = 1; i < out.length; i++) {
    const p = out[i - 1];
    const c = out[i];
    if (p.MACD === undefined || p.signal === undefined || c.MACD === undefined || c.signal === undefined) continue;
    const prevDiff = p.MACD - p.signal;
    const curDiff = c.MACD - c.signal;
    if (prevDiff <= 0 && curDiff > 0) sigs[pad + i] = "BUY";
    else if (prevDiff >= 0 && curDiff < 0) sigs[pad + i] = "SELL";
  }
  return sigs;
}

function emaCrossSignals(closes: number[]): ("BUY" | "SELL" | null)[] {
  if (closes.length < 200) return new Array(closes.length).fill(null);
  const fast = EMA.calculate({ values: closes, period: 50 });
  const slow = EMA.calculate({ values: closes, period: 200 });
  // Align both to the closes length using their own pads
  const padFast = closes.length - fast.length;
  const padSlow = closes.length - slow.length;
  const start = Math.max(padFast, padSlow);
  const sigs: ("BUY" | "SELL" | null)[] = new Array(closes.length).fill(null);
  for (let i = start + 1; i < closes.length; i++) {
    const fPrev = fast[i - 1 - padFast];
    const fCur = fast[i - padFast];
    const sPrev = slow[i - 1 - padSlow];
    const sCur = slow[i - padSlow];
    if (fPrev <= sPrev && fCur > sCur) sigs[i] = "BUY";
    else if (fPrev >= sPrev && fCur < sCur) sigs[i] = "SELL";
  }
  return sigs;
}

function getSignals(strategy: Strategy, closes: number[]) {
  switch (strategy) {
    case "RSI":       return rsiSignals(closes);
    case "MACD":      return macdSignals(closes);
    case "EMA_CROSS": return emaCrossSignals(closes);
  }
}

export function runBacktest(candles: Candle[], strategy: Strategy, startingEquity = 10_000): BacktestStats {
  const closes = candles.map((c) => c.close);
  const signals = getSignals(strategy, closes);

  const trades: BacktestTrade[] = [];
  type Open = { entryTs: number; entryPrice: number; direction: "LONG" | "SHORT" };
  let open: Open | null = null;

  for (let i = 0; i < candles.length; i++) {
    const sig = signals[i];
    if (!sig) continue;
    const candle = candles[i];

    if (!open) {
      open = {
        entryTs: candle.timestamp,
        entryPrice: candle.close,
        direction: sig === "BUY" ? "LONG" : "SHORT",
      };
    } else if (
      (open.direction === "LONG" && sig === "SELL") ||
      (open.direction === "SHORT" && sig === "BUY")
    ) {
      const exitPrice = candle.close;
      const pnl =
        open.direction === "LONG"
          ? exitPrice - open.entryPrice
          : open.entryPrice - exitPrice;
      const pnlPct = pnl / open.entryPrice;
      trades.push({
        entryTs: open.entryTs,
        entryPrice: open.entryPrice,
        exitTs: candle.timestamp,
        exitPrice,
        direction: open.direction,
        pnl: Number(pnl.toFixed(2)),
        pnlPct: Number(pnlPct.toFixed(4)),
      });
      // Flip into new position in the opposite direction
      open = {
        entryTs: candle.timestamp,
        entryPrice: exitPrice,
        direction: sig === "BUY" ? "LONG" : "SHORT",
      };
    }
  }

  // Equity curve from compounded percentage returns
  let equity = startingEquity;
  const equityCurve: { ts: number; equity: number }[] = [];
  for (const t of trades) {
    equity = equity * (1 + t.pnlPct);
    equityCurve.push({ ts: t.exitTs, equity: Number(equity.toFixed(2)) });
  }

  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? wins / trades.length : 0;
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const totalPnLPct = (equity - startingEquity) / startingEquity;

  // Sharpe: per-trade returns, annualized assuming ~252 trades/yr (rough)
  const returns = trades.map((t) => t.pnlPct);
  const mean = returns.length ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
      : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

  // Max drawdown from the equity curve
  let peak = startingEquity;
  let maxDD = 0;
  let running = startingEquity;
  for (const point of equityCurve) {
    running = point.equity;
    if (running > peak) peak = running;
    const dd = (running - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    trades,
    totalTrades: trades.length,
    winRate: Number(winRate.toFixed(4)),
    totalPnL: Number(totalPnL.toFixed(2)),
    totalPnLPct: Number(totalPnLPct.toFixed(4)),
    sharpe: Number(sharpe.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(4)),
    equityCurve,
  };
}

// CSV parser: accepts headers timestamp,open,high,low,close[,volume]
// Header is case-insensitive. Timestamp can be ISO string or unix seconds/ms.
export function parseCandlesCSV(csv: string): Candle[] {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const ti = idx("timestamp") !== -1 ? idx("timestamp") : idx("time") !== -1 ? idx("time") : idx("date");
  const oi = idx("open"), hi = idx("high"), li = idx("low"), ci = idx("close"), vi = idx("volume");
  if (ti < 0 || oi < 0 || hi < 0 || li < 0 || ci < 0) {
    throw new Error("CSV missing required columns: timestamp,open,high,low,close");
  }

  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 5) continue;
    const raw = parts[ti].trim();
    let ts: number;
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      ts = n < 10_000_000_000 ? n * 1000 : n;
    } else {
      ts = Date.parse(raw);
    }
    if (Number.isNaN(ts)) continue;
    out.push({
      timestamp: ts,
      open: Number(parts[oi]),
      high: Number(parts[hi]),
      low: Number(parts[li]),
      close: Number(parts[ci]),
      volume: vi >= 0 ? Number(parts[vi]) : undefined,
    });
  }
  return out.filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close));
}
