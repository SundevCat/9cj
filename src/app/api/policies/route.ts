import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const policies = await prisma.policy.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.ruleType || body?.threshold === undefined) {
    return NextResponse.json({ error: "name, ruleType, threshold required" }, { status: 400 });
  }
  const policy = await prisma.policy.create({
    data: {
      name: String(body.name),
      description: String(body.description ?? ""),
      ruleType: String(body.ruleType),
      threshold: Number(body.threshold) || 0,
      enabled: body.enabled !== false,
    },
  });
  return NextResponse.json({ policy }, { status: 201 });
}
