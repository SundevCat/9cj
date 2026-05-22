import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await prisma.kanbanCard.findMany({
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const status = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"].includes(String(body.status || "")) ? String(body.status) : "BACKLOG";
  const priority = ["HIGH", "MEDIUM", "LOW"].includes(String(body.priority || "")) ? String(body.priority) : "MEDIUM";

  // Append to end of the column
  const last = await prisma.kanbanCard.findFirst({
    where: { status },
    orderBy: { position: "desc" },
  });

  const card = await prisma.kanbanCard.create({
    data: {
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      status,
      priority,
      moduleTag: body.moduleTag ? String(body.moduleTag) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      position: (last?.position ?? -1) + 1,
    },
  });
  return NextResponse.json({ card }, { status: 201 });
}
