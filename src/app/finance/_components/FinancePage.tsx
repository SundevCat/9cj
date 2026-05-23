"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

type Summary = {
  metrics: {
    netWorth: number;
    monthlyIncome: number;
    monthlyBurn: number;
    savingsRate: number;
    tradingPnl: number;
    portfolioTotal: number;
  };
  months: { month: string; income: number; expense: number; net: number }[];
  budgets: { category: string; monthly: number; spent: number; pct: number }[];
  portfolio: { asset: string; amount: number; pct: number }[];
  currency: string;
};

type Entry = {
  id: number;
  occurredOn: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  currency: string;
  notes: string | null;
};

const fmtTHB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

export function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function load() {
    const [s, e] = await Promise.all([
      fetch("/api/finance/summary", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/finance/entries?limit=20", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setSummary(s as Summary);
    setEntries((e as { entries: Entry[] }).entries);
  }
  useEffect(() => { load(); }, []);

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const csv = await f.text();
      const res = await fetch("/api/finance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "import failed");
      setImportMsg(`Imported ${j.imported} rows`);
      await load();
    } catch (err) {
      setImportMsg((err as Error).message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function seed() {
    setImporting(true);
    setImportMsg("seeding demo data…");
    try {
      const res = await fetch("/api/finance/seed-demo", { method: "POST" });
      const j = await res.json();
      setImportMsg(j.ok ? `Seeded ${j.entries} entries` : (j.error || "seed failed"));
      await load();
    } catch (e) {
      setImportMsg((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const monthlyChart = useMemo(() => summary?.months ?? [], [summary]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Net Worth"     value={summary ? fmtTHB.format(summary.metrics.netWorth) : "—"} tone="green" hint="portfolio + YTD net" />
        <Stat label="Trading P&L"   value={summary ? fmtTHB.format(summary.metrics.tradingPnl) : "—"} tone={(summary?.metrics.tradingPnl ?? 0) >= 0 ? "green" : "red"} hint="closed trades" />
        <Stat label="Monthly Burn"  value={summary ? fmtTHB.format(summary.metrics.monthlyBurn) : "—"} tone="amber" hint="this month" />
        <Stat label="Savings Rate"  value={summary ? `${(summary.metrics.savingsRate * 100).toFixed(1)}%` : "—"} tone={(summary?.metrics.savingsRate ?? 0) >= 0.2 ? "green" : "amber"} hint={`income ${summary ? fmtTHB.format(summary.metrics.monthlyIncome) : "—"}`} />
      </div>

      {/* Tools row */}
      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <label className="mono text-xs uppercase tracking-widest py-2 px-3 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/40 hover:bg-accent-blue/25 cursor-pointer transition-colors">
          {importing ? "importing…" : "import CSV"}
          <input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
        </label>
        <button
          onClick={seed}
          disabled={importing}
          className="mono text-xs uppercase tracking-widest py-2 px-3 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 transition-colors disabled:opacity-50"
        >
          load demo data
        </button>
        <span className="mono text-[11px] text-ink-dim">
          cols: date,description,amount[,category] · negative = expense
        </span>
        {importMsg && <span className="mono text-[11px] text-accent-green ml-auto">{importMsg}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent entries */}
        <div className="panel overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="display text-sm font-semibold">Recent Entries</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">{entries.length} shown</div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-normal">Date</th>
                  <th className="text-left px-3 py-2 font-normal">Type</th>
                  <th className="text-left px-3 py-2 font-normal">Category</th>
                  <th className="text-right px-3 py-2 font-normal">Amount</th>
                  <th className="text-left px-3 py-2 font-normal">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-dim mono text-xs">No entries yet — import a CSV or load demo data.</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{new Date(e.occurredOn).toLocaleDateString("en-GB")}</td>
                    <td className={`px-3 py-2 mono text-[11px] font-bold ${e.type === "INCOME" ? "text-accent-green" : "text-accent-red"}`}>{e.type}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink">{e.category}</td>
                    <td className={`px-3 py-2 mono text-right ${e.type === "INCOME" ? "text-accent-green" : "text-accent-red"}`}>
                      {e.type === "INCOME" ? "+" : "−"}{fmtTHB.format(e.amount)}
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted truncate max-w-[260px]">{e.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Portfolio allocation */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="display text-sm font-semibold">Portfolio</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">
              {summary ? fmtTHB.format(summary.metrics.portfolioTotal) : "—"}
            </div>
          </div>
          {summary && summary.portfolio.length === 0 && (
            <div className="text-ink-dim mono text-xs">No holdings yet.</div>
          )}
          {summary?.portfolio.map((p) => (
            <div key={p.asset} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="mono text-xs text-ink">{p.asset}</span>
                <span className="mono text-xs text-ink-muted">{(p.pct * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded bg-bg-raised overflow-hidden">
                <div className="h-full bg-accent-blue" style={{ width: `${p.pct * 100}%` }} />
              </div>
              <div className="mono text-[10px] text-ink-dim">{fmtTHB.format(p.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Monthly P&L chart */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Monthly P&L</div>
          <div className="h-[260px]">
            {monthlyChart.length === 0 ? (
              <div className="h-full grid place-items-center text-ink-dim mono text-xs">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#1f242d" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#5a6273" tick={{ fontFamily: "var(--font-space-mono)", fontSize: 10 }} />
                  <YAxis stroke="#5a6273" tick={{ fontFamily: "var(--font-space-mono)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#0a0c10", border: "1px solid #1f242d", fontFamily: "var(--font-space-mono)", fontSize: 11 }}
                    formatter={(v) => fmtTHB.format(Number(v))}
                  />
                  <ReferenceLine y={0} stroke="#1f242d" />
                  <Bar dataKey="income" fill="#68D391" />
                  <Bar dataKey="expense" fill="#FC8181" />
                  <Bar dataKey="net" fill="#63B3ED" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Budget utilization */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="display text-sm font-semibold">Budget Utilization</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">this month</div>
          </div>
          {summary && summary.budgets.length === 0 && (
            <div className="text-ink-dim mono text-xs">No budgets set.</div>
          )}
          {summary?.budgets.map((b) => {
            const pct = Math.min(1, b.pct);
            const over = b.pct > 1;
            const tone = b.pct < 0.7 ? "bg-accent-green" : b.pct < 1 ? "bg-accent-amber" : "bg-accent-red";
            return (
              <div key={b.category} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="mono text-xs text-ink">{b.category}</span>
                  <span className={`mono text-xs ${over ? "text-accent-red" : "text-ink-muted"}`}>
                    {fmtTHB.format(b.spent)} / {fmtTHB.format(b.monthly)}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-bg-raised overflow-hidden">
                  <div className={`h-full ${tone}`} style={{ width: `${pct * 100}%` }} />
                </div>
                <div className={`mono text-[10px] ${over ? "text-accent-red" : "text-ink-dim"}`}>
                  {(b.pct * 100).toFixed(0)}%{over && " · OVER"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label, value, tone = "neutral", hint,
}: { label: string; value: string; tone?: "green" | "red" | "amber" | "neutral"; hint?: string }) {
  const map = { green: "text-accent-green", red: "text-accent-red", amber: "text-accent-amber", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
      {hint && <div className="mono text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}
