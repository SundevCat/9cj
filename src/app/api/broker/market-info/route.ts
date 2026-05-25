import { NextRequest, NextResponse } from "next/server";
import { getMarketInfo, currentBroker, BrokerUnavailableError } from "@/lib/broker";

export const dynamic = "force-dynamic";

// GET /api/broker/market-info?instrument=XAU_USD
// Returns Capital's market info — margin factor, lot size, etc.
// Result is cached in the broker layer for 5 min, so this is cheap.
export async function GET(req: NextRequest) {
  const broker = currentBroker();
  if (!broker.configured) {
    return NextResponse.json(
      { error: `No broker configured (BROKER=${broker.name}). ${broker.envHint ?? ""}` },
      { status: 503 }
    );
  }

  const instrument = req.nextUrl.searchParams.get("instrument") ?? "XAU_USD";
  try {
    const info = await getMarketInfo(instrument);
    return NextResponse.json(
      { ...info, instrument },
      { status: 200, headers: { "Cache-Control": "max-age=300" } }
    );
  } catch (e) {
    const status = e instanceof BrokerUnavailableError ? 503 : 502;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
