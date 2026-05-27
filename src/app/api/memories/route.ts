import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const tag = sp.get("tag");
  const agent = sp.get("agent");
  const limit = Math.min(Number(sp.get("limit") ?? 200), 1000);

  const where: Record<string, unknown> = {};
  if (tag) where.tag = tag;
  if (agent) where.agent = { contains: agent };
  if (search) {
    where.OR = [
      { message: { contains: search } },
      { agent: { contains: search } },
    ];
  }

  const [memories, total, oldest, indexedAgents, indexedTags] = await Promise.all([
    prisma.memory.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.memory.count(),
    prisma.memory.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.memory.findMany({ distinct: ["agent"], select: { agent: true } }),
    prisma.memory.findMany({ distinct: ["tag"], select: { tag: true } }),
  ]);

  return NextResponse.json({
    memories,
    metrics: {
      total,
      shown: memories.length,
      oldest: oldest?.createdAt ?? null,
      agents: indexedAgents.map((a) => a.agent).sort(),
      tags: indexedTags.map((t) => t.tag).sort(),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.agent || !body?.tag || !body?.message) {
    return NextResponse.json({ error: "agent, tag, message required" }, { status: 400 });
  }
  const memory = await prisma.memory.create({
    data: {
      agent: String(body.agent),
      tag: String(body.tag).toUpperCase(),
      message: String(body.message),
      metadata: body.metadata ? (body.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
  return NextResponse.json({ memory }, { status: 201 });
}
