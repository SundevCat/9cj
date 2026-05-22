import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStatementCSV } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.csv || typeof body.csv !== "string") {
    return NextResponse.json({ error: "expected { csv: string }" }, { status: 400 });
  }
  let rows;
  try {
    rows = parseStatementCSV(body.csv);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, message: "no rows parsed" });
  }
  await prisma.financeEntry.createMany({
    data: rows.map((r) => ({
      type: r.type,
      category: r.category,
      amount: r.amount,
      currency: body.currency || "THB",
      notes: r.notes,
      occurredOn: r.occurredOn,
    })),
  });
  return NextResponse.json({ imported: rows.length });
}
