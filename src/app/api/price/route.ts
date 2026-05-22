import { NextResponse } from "next/server";
import { fetchSpotXAU } from "@/lib/goldApi";
import { ensurePriceHistory, recordTick } from "@/lib/seed";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensurePriceHistory();
  const spot = await fetchSpotXAU();
  await recordTick(spot.price);

  // Compute change vs previous candle
  const last2 = await prisma.price.findMany({
    orderBy: { timestamp: "desc" },
    take: 2,
  });
  const prev = last2[1]?.close ?? spot.price;
  const delta = spot.price - prev;
  const deltaPct = prev ? delta / prev : 0;

  return NextResponse.json({
    price: spot.price,
    source: spot.source,
    fetchedAt: spot.fetchedAt,
    delta: Number(delta.toFixed(2)),
    deltaPct: Number((deltaPct * 100).toFixed(3)),
  });
}
