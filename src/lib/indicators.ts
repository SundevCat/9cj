import { RSI, MACD, EMA } from "technicalindicators";

export type Signal = "BUY" | "SELL" | "NEUTRAL";

export type RSIResult = {
  value: number | null;
  signal: Signal;
  period: number;
};

export type MACDResult = {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  trend: Signal;
};

export type EMAResult = {
  ema50: number | null;
  ema200: number | null;
  signal: Signal; // golden cross / death cross
};

export type SignalBundle = {
  closes: number[];
  rsi: RSIResult;
  macd: MACDResult;
  ema: EMAResult;
  asOf: string;
};

export function computeRSI(closes: number[], period = 14): RSIResult {
  if (closes.length < period + 1) {
    return { value: null, signal: "NEUTRAL", period };
  }
  const out = RSI.calculate({ values: closes, period });
  const value = out[out.length - 1] ?? null;
  let signal: Signal = "NEUTRAL";
  if (value !== null) {
    // MOMENTUM (trend-following) — opposite of textbook Wilder convention.
    // Rationale: in a strong downtrend RSI sits below 30 for extended periods,
    // so we want to SELL with the trend, not fade it. Same for >70 → BUY.
    // If you want classic mean-reversion (<30 BUY, >70 SELL), flip these.
    if (value < 30) signal = "SELL";
    else if (value > 70) signal = "BUY";
  }
  return { value: value === null ? null : Number(value.toFixed(2)), signal, period };
}

export function computeMACD(closes: number[]): MACDResult {
  if (closes.length < 35) {
    return { macd: null, signal: null, histogram: null, trend: "NEUTRAL" };
  }
  const out = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const last = out[out.length - 1];
  if (!last || last.MACD === undefined || last.signal === undefined) {
    return { macd: null, signal: null, histogram: null, trend: "NEUTRAL" };
  }
  const hist = (last.histogram ?? last.MACD - last.signal) as number;
  let trend: Signal = "NEUTRAL";
  if (last.MACD > last.signal && hist > 0) trend = "BUY";
  else if (last.MACD < last.signal && hist < 0) trend = "SELL";
  return {
    macd: Number(last.MACD.toFixed(3)),
    signal: Number(last.signal.toFixed(3)),
    histogram: Number(hist.toFixed(3)),
    trend,
  };
}

export function computeEMA(closes: number[]): EMAResult {
  if (closes.length < 200) {
    const e50 = closes.length >= 50 ? EMA.calculate({ values: closes, period: 50 }) : [];
    return {
      ema50: e50.length ? Number(e50[e50.length - 1].toFixed(2)) : null,
      ema200: null,
      signal: "NEUTRAL",
    };
  }
  const ema50Arr = EMA.calculate({ values: closes, period: 50 });
  const ema200Arr = EMA.calculate({ values: closes, period: 200 });
  const e50 = ema50Arr[ema50Arr.length - 1];
  const e200 = ema200Arr[ema200Arr.length - 1];
  let signal: Signal = "NEUTRAL";
  if (e50 !== undefined && e200 !== undefined) {
    if (e50 > e200 * 1.001) signal = "BUY";
    else if (e50 < e200 * 0.999) signal = "SELL";
  }
  return {
    ema50: e50 !== undefined ? Number(e50.toFixed(2)) : null,
    ema200: e200 !== undefined ? Number(e200.toFixed(2)) : null,
    signal,
  };
}

export function computeAll(closes: number[]): SignalBundle {
  return {
    closes,
    rsi: computeRSI(closes),
    macd: computeMACD(closes),
    ema: computeEMA(closes),
    asOf: new Date().toISOString(),
  };
}
