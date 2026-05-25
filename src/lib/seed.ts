import { prisma } from "./prisma";
import { fetchSpotXAU } from "./goldApi";
import { getCandles, type CapitalResolution } from "./capital";
import { currentBroker } from "./broker";

// Seed the Price table with OHLCV candles if empty.
// Tries real Capital.com history first; falls back to a synthetic
// random walk only if the broker is unreachable.
export async function ensurePriceHistory(
  minCandles = 200,
  resolution: CapitalResolution = "MINUTE",
): Promise<number> {
  const existing = await prisma.price.count();
  if (existing >= minCandles) return existing;

  // 1. Try real candles from Capital
  const broker = currentBroker();
  if (broker.configured && broker.name === "capital") {
    try {
      const candles = await getCandles("XAU_USD", resolution, minCandles);
      if (candles.length >= Math.min(50, minCandles)) {
        await prisma.price.createMany({
          data: candles.map((c) => ({
            timestamp: new Date(c.timestamp),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || null,
            source: "capital",
          })),
          skipDuplicates: true,
        });
        const count = await prisma.price.count();
        console.info(`[seed] loaded ${candles.length} real ${resolution} candles from Capital`);
        return count;
      }
    } catch (e) {
      console.warn(`[seed] Capital candles failed, falling back to synthetic walk: ${(e as Error).message}`);
    }
  }

  // 2. Fallback: synthetic random walk anchored on current spot
  const spot = await fetchSpotXAU();
  const anchor = spot.price;

  const now = Date.now();
  const oneMin = 60_000;

  let last = anchor * (1 - 0.02 + Math.random() * 0.04);
  const rows = [];
  const FLOOR = 500;
  const CEIL = 10_000;
  for (let i = minCandles; i > 0; i--) {
    const ts = new Date(now - i * oneMin);
    const ret = (Math.random() - 0.5) * 0.0016;
    const open = last;
    const close = Math.max(FLOOR, Math.min(CEIL, open * (1 + ret)));
    const high = Math.max(open, close) * (1 + Math.random() * 0.0006);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0006);
    const volume = Math.round(800 + Math.random() * 400);
    rows.push({
      timestamp: ts,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      source: "synthetic",
    });
    last = close;
  }
  // Land the last candle on the live anchor so the next real tick joins smoothly
  const lastRow = rows[rows.length - 1];
  const anchorFixed = Number(anchor.toFixed(2));
  lastRow.close = anchorFixed;
  lastRow.high = Math.max(lastRow.high, lastRow.open, anchorFixed);
  lastRow.low = Math.min(lastRow.low, lastRow.open, anchorFixed);

  await prisma.price.createMany({ data: rows });
  console.info(`[seed] synthetic walk · ${rows.length} candles anchored at ${anchorFixed}`);
  return prisma.price.count();
}

// Append a single 1-min candle for a fresh tick (or update the current candle).
export async function recordTick(price: number): Promise<void> {
  const now = new Date();
  const bucket = new Date(now);
  bucket.setSeconds(0, 0);

  const current = await prisma.price.findFirst({
    where: { timestamp: bucket },
  });

  if (current) {
    await prisma.price.update({
      where: { id: current.id },
      data: {
        high: Math.max(current.high, price),
        low: Math.min(current.low, price),
        close: price,
        volume: (current.volume ?? 0) + 1,
      },
    });
  } else {
    await prisma.price.create({
      data: {
        timestamp: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
      },
    });
  }
}
