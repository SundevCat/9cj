import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";
import { computeAll } from "@/lib/indicators";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensurePriceHistory();
  const rows = await prisma.price.findMany({
    orderBy: { timestamp: "desc" },
    take: 250,
  });
  const closes = rows.map((r) => r.close).reverse();
  const bundle = computeAll(closes);
  return NextResponse.json({
    rsi: bundle.rsi,
    macd: bundle.macd,
    ema: bundle.ema,
    sampleSize: closes.length,
    asOf: bundle.asOf,
  });
}
