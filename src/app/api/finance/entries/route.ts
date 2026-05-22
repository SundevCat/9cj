import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 200), 1000);
  const type = req.nextUrl.searchParams.get("type");
  const entries = await prisma.financeEntry.findMany({
    where: type ? { type } : undefined,
    orderBy: { occurredOn: "desc" },
    take: limit,
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const type = String(body.type || "").toUpperCase();
  if (type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "type must be INCOME or EXPENSE" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount)) {
    return NextResponse.json({ error: "amount required" }, { status: 400 });
  }
  const category = String(body.category || "uncategorized").toLowerCase();
  const occurredOn = body.occurredOn ? new Date(body.occurredOn) : new Date();

  const entry = await prisma.financeEntry.create({
    data: {
      type,
      category,
      amount: Math.abs(amount),
      currency: String(body.currency || "THB"),
      notes: body.notes ?? null,
      occurredOn,
    },
  });
  return NextResponse.json({ entry }, { status: 201 });
}
