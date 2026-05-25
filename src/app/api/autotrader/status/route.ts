import { NextResponse } from "next/server";
import { previewTick } from "@/lib/autoTrader";

export const dynamic = "force-dynamic";

// GET /api/autotrader/status
// Read-only dry-run of the autotrader's decision logic.
// Returns indicator values, votes, verdict, cooldown, and what tick() would
// do RIGHT NOW. No side effects — safe to poll every second.
export async function GET() {
  try {
    const status = await previewTick();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
