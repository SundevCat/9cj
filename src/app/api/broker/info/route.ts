import { NextResponse } from "next/server";
import { currentBroker } from "@/lib/broker";

export const dynamic = "force-dynamic";

// GET /api/broker/info — what's active and whether it's ready
export async function GET() {
  return NextResponse.json({ broker: currentBroker() });
}
