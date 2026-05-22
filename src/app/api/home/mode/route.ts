import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/setting";

export const dynamic = "force-dynamic";

const MODES = ["WORK", "HOME", "AWAY", "SLEEP"] as const;
type Mode = typeof MODES[number];

export async function GET() {
  const value = await getSetting("home.mode", "HOME");
  return NextResponse.json({ mode: value });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode = String(body?.mode || "").toUpperCase() as Mode;
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "mode must be WORK | HOME | AWAY | SLEEP" }, { status: 400 });
  }
  await setSetting("home.mode", mode);
  return NextResponse.json({ mode });
}
