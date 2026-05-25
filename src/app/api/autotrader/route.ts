import { NextRequest, NextResponse } from "next/server";
import { getConfig, setConfig, getState, type Config } from "@/lib/autoTrader";
import { recordMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const [config, state] = await Promise.all([getConfig(), getState()]);
  return NextResponse.json({ config, state });
}

export async function PUT(req: NextRequest) {
  let body: Partial<Config>;
  try {
    body = (await req.json()) as Partial<Config>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Partial<Config> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.strategy === "CONSENSUS" || body.strategy === "MAJORITY_2OF3") patch.strategy = body.strategy;
  if (typeof body.size === "number" && body.size > 0) patch.size = body.size;
  if (body.stopLossPct === null || (typeof body.stopLossPct === "number" && body.stopLossPct >= 0)) {
    patch.stopLossPct = body.stopLossPct;
  }
  if (body.takeProfitPct === null || (typeof body.takeProfitPct === "number" && body.takeProfitPct >= 0)) {
    patch.takeProfitPct = body.takeProfitPct;
  }
  if (typeof body.cooldownSec === "number" && body.cooldownSec >= 0) patch.cooldownSec = body.cooldownSec;

  const next = await setConfig(patch);

  // Log the toggle so the audit log shows when the bot was switched on/off
  if (typeof body.enabled === "boolean") {
    await recordMemory(
      "autotrader",
      body.enabled ? "OK" : "WARN",
      `autotrader ${body.enabled ? "ENABLED" : "DISABLED"} · size=${next.size}`,
      { config: next }
    );
  }

  return NextResponse.json({ config: next });
}
