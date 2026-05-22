import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 200, 1), 1000);

  await ensurePriceHistory(limit);

  const rows = await prisma.price.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  const candles = rows
    .map((r) => ({
      timestamp: r.timestamp.getTime(),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }))
    .reverse();

  return NextResponse.json({ candles, count: candles.length });
}
