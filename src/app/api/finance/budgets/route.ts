import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const budgets = await prisma.budget.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json({ budgets });
}

// PUT replaces the whole set with the provided list (bulk-upsert).
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.budgets)) {
    return NextResponse.json({ error: "expected { budgets: [{category, monthly}] }" }, { status: 400 });
  }

  await prisma.$transaction(
    (body.budgets as Array<{ category: string; monthly: number; currency?: string }>).map((b) =>
      prisma.budget.upsert({
        where: { category: b.category.toLowerCase() },
        update: { monthly: Number(b.monthly) || 0, currency: b.currency || "THB" },
        create: { category: b.category.toLowerCase(), monthly: Number(b.monthly) || 0, currency: b.currency || "THB" },
      })
    )
  );

  const budgets = await prisma.budget.findMany({ orderBy: { category: "asc" } });
  return NextResponse.json({ budgets });
}
