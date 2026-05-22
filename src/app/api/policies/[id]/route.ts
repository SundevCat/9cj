import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.description !== undefined) data.description = String(body.description);
  if (body.ruleType !== undefined) data.ruleType = String(body.ruleType);
  if (body.threshold !== undefined) data.threshold = Number(body.threshold);
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  const policy = await prisma.policy.update({ where: { id }, data });
  return NextResponse.json({ policy });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  await prisma.policy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
