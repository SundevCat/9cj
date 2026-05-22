import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const deploys = await prisma.deployLog.findMany({
    orderBy: { ts: "desc" },
    take: 50,
  });
  return NextResponse.json({ deploys });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.service) return NextResponse.json({ error: "service required" }, { status: 400 });
  const deploy = await prisma.deployLog.create({
    data: {
      service: String(body.service),
      version: body.version ? String(body.version) : null,
      status: ["OK", "FAIL", "ROLLBACK"].includes(String(body.status || "OK")) ? String(body.status || "OK") : "OK",
      notes: body.notes ? String(body.notes) : null,
    },
  });
  return NextResponse.json({ deploy }, { status: 201 });
}
