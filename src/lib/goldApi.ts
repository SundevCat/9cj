// Fetch live XAU/USD spot from gold-api.com (free, no key).
// Falls back to a synthetic walk if the request fails.

export type Spot = {
  price: number;
  source: "gold-api" | "synthetic" | "cached";
  fetchedAt: Date;
};

const GOLD_API = "https://api.gold-api.com/price/XAU";

let synthLast = 2380 + Math.random() * 40;

function syntheticTick(): number {
  // Small Gaussian-ish step around last; clamp to plausible XAU range
  const drift = (Math.random() - 0.5) * 1.2;
  synthLast = Math.max(1500, Math.min(3500, synthLast + drift));
  return Number(synthLast.toFixed(2));
}

export async function fetchSpotXAU(timeoutMs = 5000): Promise<Spot> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GOLD_API, {
      signal: ctrl.signal,
      // Next 14 fetch cache: don't cache spot
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`gold-api ${res.status}`);
    const json = (await res.json()) as { price?: number };
    if (typeof json.price !== "number") throw new Error("missing price");
    synthLast = json.price; // anchor synthetic walk to real price
    return { price: Number(json.price.toFixed(2)), source: "gold-api", fetchedAt: new Date() };
  } catch {
    return { price: syntheticTick(), source: "synthetic", fetchedAt: new Date() };
  } finally {
    clearTimeout(t);
  }
}
