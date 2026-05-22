import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const holdings = await prisma.portfolioHolding.findMany({ orderBy: { asset: "asc" } });
  return NextResponse.json({ holdings });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.holdings)) {
    return NextResponse.json({ error: "expected { holdings: [{asset, amount}] }" }, { status: 400 });
  }
  await prisma.$transaction(
    (body.holdings as Array<{ asset: string; amount: number; currency?: string; notes?: string }>).map((h) =>
      prisma.portfolioHolding.upsert({
        where: { asset: h.asset.toUpperCase() },
        update: { amount: Number(h.amount) || 0, currency: h.currency || "THB", notes: h.notes ?? null },
        create: { asset: h.asset.toUpperCase(), amount: Number(h.amount) || 0, currency: h.currency || "THB", notes: h.notes ?? null },
      })
    )
  );
  const holdings = await prisma.portfolioHolding.findMany({ orderBy: { asset: "asc" } });
  return NextResponse.json({ holdings });
}
