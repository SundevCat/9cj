import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: {
      checks: { orderBy: { ts: "desc" }, take: 30 },
    },
  });

  const enriched = services.map((s) => {
    const checks = s.checks;
    const last = checks[0];
    const total = checks.length;
    const ok = checks.filter((c) => c.ok).length;
    const uptime = total > 0 ? ok / total : null;
    const avgLatency =
      total > 0
        ? Math.round(
            checks.reduce((sum, c) => sum + (c.latencyMs ?? 0), 0) / total
          )
        : null;
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      enabled: s.enabled,
      last: last
        ? { ts: last.ts, ok: last.ok, status: last.status, latencyMs: last.latencyMs, error: last.error }
        : null,
      uptime,
      avgLatency,
      history: checks
        .slice()
        .reverse()
        .map((c) => ({ ts: c.ts, ok: c.ok, latencyMs: c.latencyMs })),
    };
  });

  return NextResponse.json({ services: enriched });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.url) {
    return NextResponse.json({ error: "name and url required" }, { status: 400 });
  }
  try {
    const service = await prisma.service.create({
      data: {
        name: String(body.name),
        url: String(body.url),
        enabled: body.enabled !== false,
      },
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
