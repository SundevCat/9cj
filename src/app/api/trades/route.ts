import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeAction } from "@/lib/router";
import { recordMemory } from "@/lib/memory";
import { placeOrder, currentBroker, BrokerUnavailableError } from "@/lib/broker";

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
  isLive?: boolean;         // true = execute via active broker
  stopLoss?: number | null;
  takeProfit?: number | null;
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

  const size = num(body.size);
  if (size === null || size <= 0) {
    return NextResponse.json({ error: "size must be a positive number" }, { status: 400 });
  }

  const isLive = body.isLive === true;

  // ── Live broker trade ────────────────────────────────────────────────────
  if (isLive) {
    const broker = currentBroker();
    if (!broker.configured) {
      return NextResponse.json(
        { error: `No broker configured (BROKER=${broker.name}). ${broker.envHint ?? ""}` },
        { status: 503 }
      );
    }

    const units = direction === "LONG" ? size : -size;
    try {
      const result = await placeOrder({
        instrument: "XAU_USD",
        units,
        stopLossPrice: body.stopLoss ?? undefined,
        takeProfitPrice: body.takeProfit ?? undefined,
        clientComment: body.notes ?? `9CJ ${direction} ${size}oz`,
      });

      const trade = await prisma.trade.create({
        data: {
          direction,
          entry: result.fillPrice ?? 0,
          size,
          status: "OPEN",
          isLive: true,
          instrument: "XAU_USD",
          brokerOrderId: result.orderId,    // Capital dealReference
          brokerDealId: result.tradeId ?? null, // Capital dealId
          fillPrice: result.fillPrice ?? null,
          stopLoss: body.stopLoss ?? null,
          takeProfit: body.takeProfit ?? null,
          notes: body.notes ?? null,
        },
      });

      await recordMemory(
        `${broker.name}.live`,
        "TRADE",
        `LIVE ${direction} ${size}oz XAU_USD @ ${result.fillPrice ?? "market"} · order ${result.orderId}`,
        { tradeId: trade.id, broker: broker.name, orderId: result.orderId, tradeRef: result.tradeId, fillPrice: result.fillPrice }
      );

      return NextResponse.json({ trade, order: result, isLive: true, broker: broker.name }, { status: 201 });
    } catch (e) {
      const status = e instanceof BrokerUnavailableError ? 503 : 502;
      return NextResponse.json({ error: (e as Error).message }, { status });
    }
  }

  // ── Journal-only trade ────────────────────────────────────────────────────
  const entry = num(body.entry);
  if (entry === null) {
    return NextResponse.json({ error: "entry price required for journal trades" }, { status: 400 });
  }
  const exit = num(body.exit);
  const statusRaw = (body.status || (exit !== null ? "CLOSED" : "OPEN")).toUpperCase();
  const status = statusRaw === "CLOSED" ? "CLOSED" : "OPEN";

  let pnl: number | null = null;
  if (status === "CLOSED" && exit !== null) {
    pnl = direction === "LONG" ? (exit - entry) * size : (entry - exit) * size;
    pnl = Number(pnl.toFixed(2));
  }

  // Policy check + human-in-loop routing
  const route = await routeAction({
    module: "xau",
    action: "open_trade",
    size,
    pnl: pnl ?? undefined,
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
      isLive: false,
      notes: body.notes ?? null,
    },
  });

  await recordMemory(
    "xau.desk",
    "TRADE",
    `${direction} ${size} @ ${entry}${exit !== null ? ` → ${exit}` : ""} · ${status}`,
    { tradeId: trade.id, pnl }
  );

  return NextResponse.json({ trade, hits: route.hits, isLive: false }, { status: 201 });
}
