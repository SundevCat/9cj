// XAU/USD spot price fetcher
// Priority: 1) Capital.com pricing (if configured)
//           2) gold-api.com (free, no key)
//           3) synthetic random walk

import { currentBroker, getCurrentPrice as brokerPrice, BrokerUnavailableError } from "./broker";

export type SpotSource = "capital" | "gold-api" | "synthetic" | "cached";

export type Spot = {
  price: number;
  bid?: number;
  ask?: number;
  source: SpotSource;
  fetchedAt: Date;
};

// ── Capital.com pricing (via broker facade) ──────────────────────────────────

async function fetchFromBroker(timeoutMs: number): Promise<Spot> {
  // Race against a deadline since the Capital client doesn't enforce a tight timeout
  const result = await Promise.race([
    brokerPrice("XAU_USD"),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("capital pricing timeout")), timeoutMs)
    ),
  ]);
  const { bid, ask, mid } = result;
  if (!Number.isFinite(mid) || mid <= 0) throw new Error("invalid mid from capital");
  synthLast = mid;
  return { price: Number(mid.toFixed(2)), bid, ask, source: "capital", fetchedAt: new Date() };
}

// ── gold-api.com fallback (free, no key) ─────────────────────────────────────

const GOLD_API = "https://api.gold-api.com/price/XAU";

async function fetchFromGoldApi(timeoutMs: number): Promise<Spot> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GOLD_API, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`gold-api ${res.status}`);
    const json = (await res.json()) as { price?: number };
    if (typeof json.price !== "number") throw new Error("missing price");
    synthLast = json.price;
    return { price: Number(json.price.toFixed(2)), source: "gold-api", fetchedAt: new Date() };
  } finally {
    clearTimeout(t);
  }
}

// ── Synthetic fallback ────────────────────────────────────────────────────────

// Initial synthetic anchor — only used if BOTH Capital AND gold-api fail on
// the very first call. Subsequent ticks re-anchor on whatever real source
// last succeeded, so this default rarely matters.
let synthLast = 4500 + (Math.random() - 0.5) * 100;

function syntheticTick(): number {
  const drift = (Math.random() - 0.5) * 1.5;
  synthLast = Math.max(500, Math.min(10_000, synthLast + drift));
  return Number(synthLast.toFixed(2));
}

// ── Config hints ─────────────────────────────────────────────────────────────

const hintPrinted = new Set<string>();
function printHintOnce(key: string, msg: string) {
  if (hintPrinted.has(key)) return;
  hintPrinted.add(key);
  console.info(`[goldApi] ${msg}`);
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchSpotXAU(timeoutMs = 6000): Promise<Spot> {
  const broker = currentBroker();

  if (broker.configured && broker.name === "capital") {
    try {
      return await fetchFromBroker(timeoutMs);
    } catch (e) {
      const reason = e instanceof BrokerUnavailableError ? e.message : (e as Error).message;
      console.warn(`[goldApi] capital pricing failed, falling back to gold-api.com: ${reason}`);
    }
  } else if (broker.envHint && broker.name !== "none") {
    printHintOnce(`${broker.name}:hint`, `${broker.name} skipped — ${broker.envHint}`);
  }

  try {
    return await fetchFromGoldApi(timeoutMs);
  } catch (e) {
    console.warn(`[goldApi] gold-api.com failed, using synthetic: ${(e as Error).message}`);
  }

  return { price: syntheticTick(), source: "synthetic", fetchedAt: new Date() };
}
