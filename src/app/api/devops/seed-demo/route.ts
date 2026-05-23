import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Dev convenience: load a believable set of services + deploys.
export async function POST() {
  await prisma.$transaction([
    prisma.serviceCheck.deleteMany(),
    prisma.service.deleteMany(),
    prisma.deployLog.deleteMany(),
  ]);

  await prisma.service.createMany({
    data: [
      { name: "9cj-app",       url: "http://localhost:3000" },
      { name: "anthropic-api", url: "https://status.anthropic.com/api/v2/status.json" },
      { name: "gold-api",      url: "https://api.gold-api.com/price/XAU" },
      { name: "github",        url: "https://api.github.com" },
      { name: "cloudflare-1.1.1.1", url: "https://1.1.1.1" },
      { name: "vercel-status", url: "https://www.vercel-status.com" },
    ],
  });

  const now = Date.now();
  await prisma.deployLog.createMany({
    data: [
      { service: "9cj-app",       version: "v0.3.0", status: "OK",       notes: "Phase 3 modules", ts: new Date(now - 5 * 60_000) },
      { service: "9cj-app",       version: "v0.2.1", status: "OK",       notes: "Backtest fix · lightweight-charts v5", ts: new Date(now - 4 * 3600_000) },
      { service: "9cj-app",       version: "v0.2.0", status: "OK",       notes: "Phase 2 · XAU desk + backtest", ts: new Date(now - 26 * 3600_000) },
      { service: "9cj-app",       version: "v0.1.0", status: "OK",       notes: "Phase 1 · dashboard shell", ts: new Date(now - 48 * 3600_000) },
      { service: "anthropic-api", version: "n/a",    status: "OK",       notes: "Upstream advisory · normal ops", ts: new Date(now - 6 * 3600_000) },
    ],
  });

  return NextResponse.json({ ok: true });
}
