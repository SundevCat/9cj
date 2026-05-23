import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const violations = await prisma.violation.findMany({
    orderBy: { ts: "desc" },
    take: 100,
  });
  const policies = await prisma.policy.findMany({
    where: { id: { in: violations.map((v) => v.policyId) } },
  });
  const map = new Map(policies.map((p) => [p.id, p]));
  // context is a Postgres Json column — already parsed
  return NextResponse.json({
    violations: violations.map((v) => ({
      ...v,
      policyName: map.get(v.policyId)?.name ?? `policy#${v.policyId}`,
    })),
  });
}
