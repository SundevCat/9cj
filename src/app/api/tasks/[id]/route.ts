import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

const VALID = new Set(["PENDING", "APPROVED", "REJECTED", "DONE"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  if (!VALID.has(status)) {
    return NextResponse.json({ error: `status must be one of ${Array.from(VALID).join(", ")}` }, { status: 400 });
  }

  const task = await prisma.task.update({ where: { id }, data: { status } });

  // Resolve linked violations on approve/reject so the policy page reflects the outcome.
  if (status === "APPROVED" || status === "REJECTED") {
    await prisma.violation.updateMany({ where: { taskId: id }, data: { resolved: true } });
  }

  const tag = status === "APPROVED" ? "OK" : status === "REJECTED" ? "WARN" : status === "DONE" ? "SYS" : "AI";
  await recordMemory("human.in_loop", tag, `${status} · ${task.title}`, { taskId: id });

  return NextResponse.json({ task });
}
