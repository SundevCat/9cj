import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  const [entries, budgets, holdings] = await Promise.all([
    prisma.financeEntry.findMany({ orderBy: { occurredOn: "desc" } }),
    prisma.budget.findMany(),
    prisma.portfolioHolding.findMany(),
  ]);

  // Monthly aggregation
  const monthly = new Map<string, { income: number; expense: number }>();
  for (const e of entries) {
    const k = monthKey(e.occurredOn);
    const cur = monthly.get(k) ?? { income: 0, expense: 0 };
    if (e.type === "INCOME") cur.income += e.amount;
    else cur.expense += e.amount;
    monthly.set(k, cur);
  }
  const months = Array.from(monthly.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([month, v]) => ({ month, income: round(v.income), expense: round(v.expense), net: round(v.income - v.expense) }));

  // Current month metrics
  const now = new Date();
  const curKey = monthKey(now);
  const cur = monthly.get(curKey) ?? { income: 0, expense: 0 };
  const monthlyBurn = cur.expense;
  const monthlyIncome = cur.income;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyBurn) / monthlyIncome) : 0;

  // Budget utilization for current month
  const expensesByCat = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "EXPENSE") continue;
    if (monthKey(e.occurredOn) !== curKey) continue;
    expensesByCat.set(e.category, (expensesByCat.get(e.category) ?? 0) + e.amount);
  }
  const budgetRows = budgets
    .map((b) => {
      const spent = expensesByCat.get(b.category) ?? 0;
      return {
        category: b.category,
        monthly: b.monthly,
        spent: round(spent),
        pct: b.monthly > 0 ? Math.min(1.5, spent / b.monthly) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  // Portfolio totals
  const portfolioTotal = holdings.reduce((s, h) => s + h.amount, 0);
  const portfolio = holdings
    .map((h) => ({
      asset: h.asset,
      amount: round(h.amount),
      pct: portfolioTotal > 0 ? h.amount / portfolioTotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // YTD net + trading P&L from Trade table
  const ytdNet = entries
    .filter((e) => e.occurredOn.getFullYear() === now.getFullYear())
    .reduce((s, e) => s + (e.type === "INCOME" ? e.amount : -e.amount), 0);

  const trades = await prisma.trade.findMany({ where: { status: "CLOSED" } });
  const tradingPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Net worth = portfolio + YTD net (rough proxy)
  const netWorth = portfolioTotal + ytdNet;

  return NextResponse.json({
    metrics: {
      netWorth: round(netWorth),
      monthlyIncome: round(monthlyIncome),
      monthlyBurn: round(monthlyBurn),
      savingsRate: round(savingsRate, 3),
      tradingPnl: round(tradingPnl),
      portfolioTotal: round(portfolioTotal),
    },
    months,
    budgets: budgetRows,
    portfolio,
    currency: "THB",
  });
}

function round(n: number, p = 2): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}
