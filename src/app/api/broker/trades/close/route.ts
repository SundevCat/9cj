import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeTrade, currentBroker, BrokerUnavailableError } from "@/lib/broker";
import { CapitalPositionNotFoundError } from "@/lib/capital";
import { recordMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

// POST /api/broker/trades/close
// Body: { tradeId: number }  — local Trade.id (must be a live broker trade)
export async function POST(req: NextRequest) {
  let body: { tradeId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.tradeId) return NextResponse.json({ error: "tradeId required" }, { status: 400 });

  const trade = await prisma.trade.findUnique({ where: { id: body.tradeId } });
  if (!trade) return NextResponse.json({ error: "trade not found" }, { status: 404 });
  if (!trade.isLive || !trade.brokerDealId) {
    return NextResponse.json({ error: "This is not a live broker trade" }, { status: 400 });
  }
  if (trade.status === "CLOSED") {
    return NextResponse.json({ error: "Trade already closed" }, { status: 400 });
  }

  const broker = currentBroker();
  if (!broker.configured) {
    return NextResponse.json(
      { error: `No broker configured (BROKER=${broker.name}). ${broker.envHint ?? ""}` },
      { status: 503 }
    );
  }

  try {
    const result = await closeTrade(trade.brokerDealId);
    const pnl = Number(result.realizedPL.toFixed(2));

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        exit: result.closePrice,
        fillPrice: result.closePrice,
        pnl,
        status: "CLOSED",
      },
    });

    await recordMemory(
      `${broker.name}.live`,
      "TRADE",
      `CLOSED ${trade.direction} ${trade.size}oz XAU_USD @ ${result.closePrice} · PnL ${pnl >= 0 ? "+" : ""}${pnl}`,
      { tradeId: trade.id, broker: broker.name, brokerDealId: trade.brokerDealId, closePrice: result.closePrice, pnl }
    );

    return NextResponse.json({ trade: updated, closePrice: result.closePrice, pnl, broker: broker.name });
  } catch (e) {
    // Escape hatch: the broker has no matching open position (closed externally,
    // SL/TP hit, dealId mismatch with no fallback, etc). Mark local row CLOSED
    // so the UI isn't stuck showing a phantom open trade.
    if (e instanceof CapitalPositionNotFoundError) {
      const updated = await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: "CLOSED",
          exit: trade.exit ?? trade.entry,
          notes: (trade.notes ?? "") + " · marked closed locally (broker had no matching position)",
        },
      });
      await recordMemory(
        `${broker.name}.live`,
        "WARN",
        `marked CLOSED locally · ${trade.direction} ${trade.size}oz XAU_USD · ${e.message}`,
        { tradeId: trade.id, broker: broker.name, brokerDealId: trade.brokerDealId, reason: e.message }
      );
      return NextResponse.json(
        { trade: updated, note: "marked closed locally", reason: e.message, broker: broker.name },
        { status: 200 }
      );
    }
    const status = e instanceof BrokerUnavailableError ? 503 : 502;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
