import { NextResponse } from "next/server";
import { getFleet } from "@/lib/homeAssistant";

export const dynamic = "force-dynamic";

export async function GET() {
  const fleet = await getFleet();
  return NextResponse.json(fleet);
}
