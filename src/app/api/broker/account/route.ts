import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccount, currentBroker, BrokerUnavailableError } from "@/lib/broker";

export const dynamic = "force-dynamic";

// GET /api/broker/account
// Broker-agnostic account summary for whichever broker is configured.
// Caches a snapshot in DB (max 1 per 30s) to avoid hammering the upstream API.
export async function GET() {
  const broker = currentBroker();
  if (!broker.configured) {
    return NextResponse.json(
      { error: `No broker configured (BROKER=${broker.name}). ${broker.envHint ?? ""}`, broker: broker.name },
      { status: 503 }
    );
  }

  try {
    const cached = await prisma.brokerSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
    const thirtySecondsAgo = new Date(Date.now() - 30_000);
    if (
      cached &&
      cached.fetchedAt > thirtySecondsAgo &&
      cached.broker === broker.name
    ) {
      return NextResponse.json({ account: cached, live: extractLive(cached.raw), broker: broker.name, cached: true });
    }

    const account = await getAccount();

    const snapshot = await prisma.brokerSnapshot.create({
      data: {
        broker: broker.name,
        accountId: account.accountId,
        balance: account.balance,
        unrealizedPL: account.unrealizedPL,
        realizedPL: account.realizedPL,
        marginUsed: account.marginUsed,
        openTradeCount: account.openTradeCount,
        raw: { broker: broker.name, ...account } as object,
      },
    });

    return NextResponse.json({ account: snapshot, live: account, broker: broker.name, cached: false });
  } catch (e) {
    const status = e instanceof BrokerUnavailableError ? 503 : 502;
    return NextResponse.json({ error: (e as Error).message, broker: broker.name }, { status });
  }
}

type LiveAccount = { balance?: number; unrealizedPL?: number; realizedPL?: number; marginUsed?: number; openTradeCount?: number; nav?: number; currency?: string; broker?: string };

function extractLive(raw: unknown): LiveAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as LiveAccount;
  return {
    balance: r.balance,
    unrealizedPL: r.unrealizedPL,
    realizedPL: r.realizedPL,
    marginUsed: r.marginUsed,
    openTradeCount: r.openTradeCount,
    nav: r.nav,
    currency: r.currency,
    broker: r.broker,
  };
}
