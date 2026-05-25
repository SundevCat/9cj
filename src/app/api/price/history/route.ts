import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";
import { getCandles, type CapitalResolution } from "@/lib/capital";
import { currentBroker } from "@/lib/broker";

export const dynamic = "force-dynamic";

const VALID_RESOLUTIONS: CapitalResolution[] = [
  "MINUTE", "MINUTE_5", "MINUTE_15", "MINUTE_30", "HOUR", "HOUR_4", "DAY", "WEEK",
];

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 200, 1), 1000);

  const resParam = (req.nextUrl.searchParams.get("resolution") || "MINUTE").toUpperCase() as CapitalResolution;
  const resolution: CapitalResolution = VALID_RESOLUTIONS.includes(resParam) ? resParam : "MINUTE";

  // For 1-min, serve from the local Price table (fast + accumulates via SSE).
  // For higher timeframes, fetch live from Capital each call (no local cache).
  if (resolution === "MINUTE") {
    await ensurePriceHistory(limit, "MINUTE");
    const rows = await prisma.price.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    const candles = dedupeByTimestamp(
      rows
        .map((r) => ({
          timestamp: r.timestamp.getTime(),
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
        }))
        .reverse()
    );
    return NextResponse.json({ candles, count: candles.length, resolution, source: "local" });
  }

  // Higher resolutions — straight pass-through from Capital
  const broker = currentBroker();
  if (!broker.configured) {
    return NextResponse.json(
      { error: `Higher timeframes require a configured broker. ${broker.envHint ?? ""}` },
      { status: 503 }
    );
  }

  try {
    const raw = await getCandles("XAU_USD", resolution, limit);
    const candles = dedupeByTimestamp(raw);
    return NextResponse.json({ candles, count: candles.length, resolution, source: "capital" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

// lightweight-charts requires strictly ascending unique timestamps.
// We dedupe at the API boundary so the chart never sees duplicates,
// regardless of whether they came from the broker or local DB.
type Bar = { timestamp: number; open: number; high: number; low: number; close: number; volume?: number | null };
function dedupeByTimestamp<T extends Bar>(bars: T[]): T[] {
  const byTs = new Map<number, T>();
  for (const b of bars) byTs.set(b.timestamp, b);
  return Array.from(byTs.values()).sort((a, b) => a.timestamp - b.timestamp);
}
