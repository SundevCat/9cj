import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";
import { runBacktest, parseCandlesCSV, type Candle, type Strategy } from "@/lib/backtest";

export const dynamic = "force-dynamic";

type Body = {
  strategy?: Strategy;
  startingEquity?: number;
  source?: "stored" | "csv";
  csv?: string;
  limit?: number;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const strategy = (body.strategy || "RSI") as Strategy;
  if (!["RSI", "MACD", "EMA_CROSS"].includes(strategy)) {
    return NextResponse.json({ error: "unknown strategy" }, { status: 400 });
  }

  let candles: Candle[] = [];

  if (body.source === "csv" && body.csv) {
    try {
      candles = parseCandlesCSV(body.csv);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } else {
    const limit = Math.min(Math.max(body.limit ?? 500, 30), 5000);
    await ensurePriceHistory(Math.min(limit, 500));
    const rows = await prisma.price.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });
    candles = rows
      .map((r) => ({
        timestamp: r.timestamp.getTime(),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume ?? undefined,
      }))
      .reverse();
  }

  if (candles.length < 30) {
    return NextResponse.json({ error: "need at least 30 candles" }, { status: 400 });
  }

  const result = runBacktest(candles, strategy, body.startingEquity ?? 10_000);
  return NextResponse.json({
    strategy,
    candleCount: candles.length,
    ...result,
  });
}
