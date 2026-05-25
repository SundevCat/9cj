import { NextRequest, NextResponse } from "next/server";
import { triggerManual } from "@/lib/autoTrader";

export const dynamic = "force-dynamic";

// POST /api/autotrader/trigger
// Body: { direction?: "LONG" | "SHORT" }  (default LONG)
// Places a manual auto-trader trade now, bypassing signal + cooldown.
// Still routes through routeAction() so policies + HIL apply.
export async function POST(req: NextRequest) {
  let body: { direction?: string };
  try {
    body = (await req.json().catch(() => ({}))) as { direction?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const dirRaw = String(body.direction ?? "LONG").toUpperCase();
  const direction: "LONG" | "SHORT" = dirRaw === "SHORT" ? "SHORT" : "LONG";

  const result = await triggerManual(direction);
  const status = result.action === "ERROR" ? 502 : 200;
  return NextResponse.json(result, { status });
}
