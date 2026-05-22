import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePriceHistory } from "@/lib/seed";
import { fetchSpotXAU } from "@/lib/goldApi";
import { computeAll } from "@/lib/indicators";
import { monthKey } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  // --- XAU + signals --------------------------------------------------
  await ensurePriceHistory(250);
  const [spot, prices] = await Promise.all([
    fetchSpotXAU(),
    prisma.price.findMany({ orderBy: { timestamp: "desc" }, take: 250 }),
  ]);
  const closes = prices.map((p) => p.close).reverse();
  const signals = computeAll(closes);

  // --- Finance: yesterday's P&L + budget status ----------------------
  const now = new Date();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayEntries = await prisma.financeEntry.findMany({
    where: { occurredOn: { gte: startOfYesterday, lt: startOfToday } },
  });
  const yesterdayIncome = yesterdayEntries.filter((e) => e.type === "INCOME").reduce((s, e) => s + e.amount, 0);
  const yesterdayExpense = yesterdayEntries.filter((e) => e.type === "EXPENSE").reduce((s, e) => s + e.amount, 0);
  const yesterdayNet = yesterdayIncome - yesterdayExpense;

  // Current-month budget hits
  const curKey = monthKey(now);
  const monthEntries = await prisma.financeEntry.findMany();
  const expensesByCat = new Map<string, number>();
  for (const e of monthEntries) {
    if (e.type !== "EXPENSE") continue;
    if (monthKey(e.occurredOn) !== curKey) continue;
    expensesByCat.set(e.category, (expensesByCat.get(e.category) ?? 0) + e.amount);
  }
  const budgets = await prisma.budget.findMany();
  const hottestBudgets = budgets
    .map((b) => ({ category: b.category, monthly: b.monthly, spent: expensesByCat.get(b.category) ?? 0 }))
    .map((b) => ({ ...b, pct: b.monthly > 0 ? b.spent / b.monthly : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // --- Tasks: top 3 priorities ---------------------------------------
  const topTasks = await prisma.task.findMany({
    where: { status: "PENDING" },
    take: 50,
  });
  topTasks.sort((a, b) => {
    const r: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (r[a.priority] ?? 9) - (r[b.priority] ?? 9);
  });
  const topThree = topTasks.slice(0, 3);

  // --- Human-in-loop: pending count ---------------------------------
  const approvalsPending = await prisma.task.count({ where: { status: "PENDING" } });

  // --- Services snapshot --------------------------------------------
  const services = await prisma.service.findMany({ where: { enabled: true }, include: { checks: { orderBy: { ts: "desc" }, take: 1 } } });
  const servicesHealthy = services.filter((s) => s.checks[0]?.ok).length;

  // --- Trading: yesterday + today P&L --------------------------------
  const trades = await prisma.trade.findMany({
    where: { status: "CLOSED", createdAt: { gte: startOfYesterday } },
  });
  const tradeYesterday = trades.filter((t) => t.createdAt < startOfToday).reduce((s, t) => s + (t.pnl ?? 0), 0);
  const tradeToday = trades.filter((t) => t.createdAt >= startOfToday).reduce((s, t) => s + (t.pnl ?? 0), 0);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    xau: {
      price: spot.price,
      source: spot.source,
      rsi: signals.rsi,
      macd: signals.macd,
      ema: signals.ema,
    },
    finance: {
      yesterday: {
        income: Number(yesterdayIncome.toFixed(2)),
        expense: Number(yesterdayExpense.toFixed(2)),
        net: Number(yesterdayNet.toFixed(2)),
      },
      hottestBudgets,
    },
    trading: {
      yesterday: Number(tradeYesterday.toFixed(2)),
      today: Number(tradeToday.toFixed(2)),
    },
    tasks: topThree.map((t) => ({ id: t.id, title: t.title, module: t.module, priority: t.priority })),
    approvalsPending,
    services: { healthy: servicesHealthy, total: services.length },
  });
}
