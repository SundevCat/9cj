// Lightweight rule-based CSV categorizer.
// Accepts rows like: date,description,amount[,category]
// Negative amount = expense, positive = income.

export type ParsedRow = {
  occurredOn: Date;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  notes: string;
};

const RULES: { match: RegExp; category: string; type?: "INCOME" | "EXPENSE" }[] = [
  { match: /salary|payroll|consult|invoice|client|retainer/i, category: "consulting", type: "INCOME" },
  { match: /trading|forex|xau|broker.*pnl|exante|ic\s*markets/i, category: "trading", type: "INCOME" },
  { match: /dividend|interest|coupon|yield/i, category: "passive", type: "INCOME" },
  { match: /rent|condo|landlord|mortgage/i, category: "housing", type: "EXPENSE" },
  { match: /grab|taxi|bts|uber|fuel|petrol|gas station/i, category: "transport", type: "EXPENSE" },
  { match: /7-eleven|tesco|big c|lotus|villa market|tops|groceries/i, category: "groceries", type: "EXPENSE" },
  { match: /openai|anthropic|claude|github|figma|notion|vercel|aws|gcp|cloudflare|datadog/i, category: "saas", type: "EXPENSE" },
  { match: /coursera|udemy|book|kindle|substack|research/i, category: "research", type: "EXPENSE" },
  { match: /spotify|netflix|youtube|disney|hbo|game/i, category: "entertainment", type: "EXPENSE" },
  { match: /electric|water|internet|true|ais|dtac|phone bill/i, category: "utilities", type: "EXPENSE" },
  { match: /restaurant|food|cafe|starbucks|coffee|dine/i, category: "food", type: "EXPENSE" },
];

function categorize(description: string, amount: number, fallback?: string) {
  for (const r of RULES) {
    if (r.match.test(description)) return { category: r.category, type: r.type ?? (amount >= 0 ? "INCOME" : "EXPENSE") };
  }
  return {
    category: fallback || "uncategorized",
    type: (amount >= 0 ? "INCOME" : "EXPENSE") as "INCOME" | "EXPENSE",
  };
}

export function parseStatementCSV(csv: string): ParsedRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const di = header.findIndex((h) => /^(date|occurredon|time|posted)$/i.test(h));
  const desci = header.findIndex((h) => /^(description|memo|narrative|details|payee)$/i.test(h));
  const ai = header.findIndex((h) => /^(amount|value)$/i.test(h));
  const ci = header.findIndex((h) => /^(category)$/i.test(h));
  if (di < 0 || desci < 0 || ai < 0) {
    throw new Error("CSV needs columns: date,description,amount[,category]");
  }

  const out: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length <= Math.max(di, desci, ai)) continue;
    const rawDate = parts[di].trim();
    const ts = Date.parse(rawDate);
    if (Number.isNaN(ts)) continue;
    const desc = parts[desci].trim().replace(/^"|"$/g, "");
    const amount = Number(parts[ai].replace(/[,]/g, ""));
    if (!Number.isFinite(amount)) continue;
    const fallbackCat = ci >= 0 ? parts[ci]?.trim() : undefined;
    const { category, type } = categorize(desc, amount, fallbackCat);
    out.push({
      occurredOn: new Date(ts),
      type,
      category,
      amount: Math.abs(amount),
      notes: desc,
    });
  }
  return out;
}

// Helpful month-key like "2026-05"
export function monthKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
