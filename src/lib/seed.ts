import { prisma } from "./prisma";
import { fetchSpotXAU } from "./goldApi";

// Seed the Price table with synthetic OHLCV candles if empty.
// Uses a geometric-random-walk anchored on the live spot price.
export async function ensurePriceHistory(minCandles = 200): Promise<number> {
  const existing = await prisma.price.count();
  if (existing >= minCandles) return existing;

  const spot = await fetchSpotXAU();
  const anchor = spot.price;

  const now = Date.now();
  const oneMin = 60_000;

  let last = anchor * (1 - 0.02 + Math.random() * 0.04);
  const rows = [];
  for (let i = minCandles; i > 0; i--) {
    const ts = new Date(now - i * oneMin);
    // GBM-like step, sigma ~ 0.0008 per minute
    const ret = (Math.random() - 0.5) * 0.0016;
    const open = last;
    const close = Math.max(1500, Math.min(3500, open * (1 + ret)));
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
    });
    last = close;
  }
  // Make sure the last candle's close lands on the anchor for continuity.
  // Adjust high/low to preserve OHLC invariants (otherwise charts silently drop the candle).
  const lastRow = rows[rows.length - 1];
  const anchorFixed = Number(anchor.toFixed(2));
  lastRow.close = anchorFixed;
  lastRow.high = Math.max(lastRow.high, lastRow.open, anchorFixed);
  lastRow.low = Math.min(lastRow.low, lastRow.open, anchorFixed);

  await prisma.price.createMany({ data: rows });
  return prisma.price.count();
}

// Append a single 1-min candle for a fresh tick (or update the current candle).
export async function recordTick(price: number): Promise<void> {
  const now = new Date();
  // Bucket to the current minute
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
