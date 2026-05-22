import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const tasks = await prisma.task.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
  // Sort by priority then time within PENDING for clearer queue display
  tasks.sort((a, b) => {
    if (a.status === "PENDING" && b.status === "PENDING") {
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return NextResponse.json({
    tasks: tasks.map((t) => ({ ...t, metadata: t.metadata ? safeParse(t.metadata) : null })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.module) {
    return NextResponse.json({ error: "title and module required" }, { status: 400 });
  }
  const priority = ["HIGH", "MEDIUM", "LOW"].includes(String(body.priority || "")) ? String(body.priority) : "MEDIUM";
  const task = await prisma.task.create({
    data: {
      title: String(body.title),
      module: String(body.module),
      priority,
      status: "PENDING",
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return s; } }
