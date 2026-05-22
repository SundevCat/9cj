import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const k of ["title", "description", "moduleTag"] as const) {
    if (body[k] !== undefined) data[k] = body[k] === null ? null : String(body[k]);
  }
  if (body.priority !== undefined && ["HIGH", "MEDIUM", "LOW"].includes(String(body.priority))) {
    data.priority = String(body.priority);
  }
  if (body.status !== undefined && ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"].includes(String(body.status))) {
    data.status = String(body.status);
  }
  if (body.position !== undefined) data.position = Number(body.position);
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const card = await prisma.kanbanCard.update({ where: { id }, data });
  return NextResponse.json({ card });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  await prisma.kanbanCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
