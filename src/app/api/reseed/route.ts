import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";

export const dynamic = "force-dynamic";

// Dev-only helper: wipes Price table and reseeds 200 candles.
export async function POST() {
  await prisma.price.deleteMany();
  const count = await ensurePriceHistory(200);
  return NextResponse.json({ ok: true, count });
}
