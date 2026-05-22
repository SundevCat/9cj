import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Multi-get/set wrapper around the Setting key/value table.
export async function GET() {
  const rows = await prisma.setting.findMany();
  const data: Record<string, string> = {};
  for (const r of rows) data[r.key] = r.value;
  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected object" }, { status: 400 });
  }
  const entries = Object.entries(body as Record<string, unknown>).map(([key, value]) => [key, String(value)]);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
  const rows = await prisma.setting.findMany();
  const data: Record<string, string> = {};
  for (const r of rows) data[r.key] = r.value;
  return NextResponse.json({ settings: data });
}
