import { NextRequest, NextResponse } from "next/server";
import { toggleDevice } from "@/lib/homeAssistant";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const entityId = decodeURIComponent(params.id);
  const result = await toggleDevice(entityId);
  return NextResponse.json(result);
}
