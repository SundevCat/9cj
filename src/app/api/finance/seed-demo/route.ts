import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Dev convenience: load a believable spread of demo finance data
// for the past 4 months so the dashboards aren't empty on first run.
export async function POST() {
  await prisma.$transaction([
    prisma.financeEntry.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.portfolioHolding.deleteMany(),
  ]);

  const now = new Date();
  const entries: Array<{ type: string; category: string; amount: number; occurredOn: Date; notes: string }> = [];
  function push(type: string, category: string, amount: number, monthOffset: number, day: number, notes: string) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
    entries.push({ type, category, amount, occurredOn: d, notes });
  }

  for (let m = 3; m >= 0; m--) {
    // Income
    push("INCOME", "consulting", 120_000, m, 1,  "Retainer · Acme Co");
    push("INCOME", "trading",     8_000 + Math.round(Math.random() * 12_000), m, 28, "XAU desk · monthly P&L");
    push("INCOME", "passive",     6_500, m, 5,  "Dividends · SET ETF");
    // Expenses
    push("EXPENSE", "housing",    32_000, m, 1,  "Condo rent");
    push("EXPENSE", "utilities",  3_200,  m, 5,  "Electric + water");
    push("EXPENSE", "utilities",  1_800,  m, 5,  "Internet · True");
    push("EXPENSE", "groceries",  7_400 + Math.round(Math.random() * 1500), m, 10, "Tesco Lotus");
    push("EXPENSE", "food",       6_200 + Math.round(Math.random() * 2000), m, 15, "Restaurants + cafes");
    push("EXPENSE", "saas",       1_800,  m, 3,  "OpenAI + GitHub + Vercel");
    push("EXPENSE", "saas",       950,    m, 8,  "Notion + Figma");
    push("EXPENSE", "research",   2_400,  m, 12, "Coursera + books");
    push("EXPENSE", "transport",  3_600 + Math.round(Math.random() * 1200), m, 20, "Grab + BTS");
    push("EXPENSE", "entertainment", 900, m, 18, "Spotify + Netflix");
  }

  await prisma.financeEntry.createMany({
    data: entries.map((e) => ({ ...e, currency: "THB" })),
  });

  await prisma.budget.createMany({
    data: [
      { category: "housing",       monthly: 35_000 },
      { category: "utilities",     monthly: 6_000  },
      { category: "groceries",     monthly: 9_000  },
      { category: "food",          monthly: 8_000  },
      { category: "saas",          monthly: 3_500  },
      { category: "research",      monthly: 3_000  },
      { category: "transport",     monthly: 5_000  },
      { category: "entertainment", monthly: 1_500  },
    ],
  });

  await prisma.portfolioHolding.createMany({
    data: [
      { asset: "CASH",     amount: 480_000, notes: "Bank + e-wallet" },
      { asset: "XAU",      amount: 320_000, notes: "Physical + paper gold" },
      { asset: "EQUITIES", amount: 540_000, notes: "SET ETF + global index" },
      { asset: "CRYPTO",   amount: 75_000,  notes: "BTC + ETH" },
    ],
  });

  return NextResponse.json({ ok: true, entries: entries.length });
}
