import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pingUrl } from "@/lib/pinger";

export const dynamic = "force-dynamic";

export async function POST() {
  const services = await prisma.service.findMany({ where: { enabled: true } });
  const results = await Promise.all(
    services.map(async (s) => {
      const r = await pingUrl(s.url);
      await prisma.serviceCheck.create({
        data: {
          serviceId: s.id,
          ok: r.ok,
          status: r.status,
          latencyMs: r.latencyMs,
          error: r.error,
        },
      });
      return { id: s.id, name: s.name, ...r };
    })
  );
  return NextResponse.json({ checked: results.length, results });
}
