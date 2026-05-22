import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeAction } from "@/lib/router";
import { recordMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const trades = await prisma.trade.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ trades });
}

type TradeInput = {
  direction?: string;
  entry?: number | string;
  exit?: number | string | null;
  size?: number | string;
  status?: string;
  notes?: string;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  let body: TradeInput;
  try {
    body = (await req.json()) as TradeInput;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const direction = (body.direction || "").toUpperCase();
  if (direction !== "LONG" && direction !== "SHORT") {
    return NextResponse.json({ error: "direction must be LONG or SHORT" }, { status: 400 });
  }
  const entry = num(body.entry);
  const size = num(body.size);
  if (entry === null || size === null) {
    return NextResponse.json({ error: "entry and size required" }, { status: 400 });
  }
  const exit = num(body.exit);
  const statusRaw = (body.status || (exit !== null ? "CLOSED" : "OPEN")).toUpperCase();
  const status = statusRaw === "CLOSED" ? "CLOSED" : "OPEN";

  let pnl: number | null = null;
  if (status === "CLOSED" && exit !== null) {
    pnl = direction === "LONG" ? (exit - entry) * size : (entry - exit) * size;
    pnl = Number(pnl.toFixed(2));
  }

  // Route through the orchestrator: policies may block + queue for HIL.
  const route = await routeAction({
    module: "xau",
    action: "open_trade",
    size,
    pnl,
    description: `${direction} ${size} @ ${entry}`,
    raw: { direction, entry, exit, size, notes: body.notes ?? undefined },
  });

  if (route.decision === "QUEUED_FOR_APPROVAL") {
    return NextResponse.json(
      {
        queued: true,
        taskId: route.taskId,
        hits: route.hits,
        message: "Blocked by policy — queued for human approval",
      },
      { status: 202 }
    );
  }

  const trade = await prisma.trade.create({
    data: {
      direction,
      entry,
      exit,
      size,
      pnl,
      status,
      notes: body.notes ?? null,
    },
  });

  await recordMemory(
    "xau.desk",
    "TRADE",
    `${direction} ${size} @ ${entry}${exit !== null ? ` → ${exit}` : ""} · ${status}`,
    { tradeId: trade.id, pnl }
  );

  return NextResponse.json({ trade, hits: route.hits }, { status: 201 });
}
