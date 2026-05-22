import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Bulk reposition cards in one transaction. Expects:
// { updates: [{ id, status, position }] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const updates = body?.updates;
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "expected { updates: [{id,status,position}] }" }, { status: 400 });
  }
  await prisma.$transaction(
    updates.map((u: { id: number; status: string; position: number }) =>
      prisma.kanbanCard.update({
        where: { id: Number(u.id) },
        data: { status: String(u.status), position: Number(u.position) },
      })
    )
  );
  return NextResponse.json({ updated: updates.length });
}
