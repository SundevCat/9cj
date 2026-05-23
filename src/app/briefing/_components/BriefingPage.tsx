"use client";

import { useEffect, useState } from "react";

type Briefing = {
  generatedAt: string;
  xau: {
    price: number;
    source: string;
    rsi: { value: number | null; signal: string };
    macd: { trend: string; macd: number | null; signal: number | null };
    ema: { ema50: number | null; ema200: number | null; signal: string };
  };
  finance: {
    yesterday: { income: number; expense: number; net: number };
    hottestBudgets: { category: string; monthly: number; spent: number; pct: number }[];
  };
  trading: { yesterday: number; today: number };
  tasks: { id: number; title: string; module: string; priority: string }[];
  approvalsPending: number;
  services: { healthy: number; total: number };
};

const fmtTHB = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const SIGNAL_TONE: Record<string, string> = {
  BUY: "text-accent-green",
  SELL: "text-accent-red",
  NEUTRAL: "text-accent-amber",
};

export function BriefingPage() {
  const [b, setB] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/briefing", { cache: "no-store" });
      const j = await res.json();
      setB(j);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (!b) {
    return <div className="panel p-12 text-center mono text-xs text-ink-dim">Generating briefing…</div>;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="panel-raised p-6 flex flex-col gap-2 bg-gradient-to-br from-bg-raised to-bg-panel border-accent-blue/30">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          {new Date(b.generatedAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
        </div>
        <div className="display text-2xl font-bold">{greeting}, Chirapong.</div>
        <div className="text-ink-muted text-sm">
          Gold is <span className="text-accent-amber mono">{b.xau.price.toFixed(2)}</span> ({b.xau.source}).{" "}
          {b.trading.yesterday !== 0 && <>Trading closed yesterday at <span className={b.trading.yesterday >= 0 ? "text-accent-green mono" : "text-accent-red mono"}>{b.trading.yesterday >= 0 ? "+" : ""}{b.trading.yesterday.toFixed(2)}</span>. </>}
          You have <span className="text-accent-purple mono">{b.approvalsPending}</span> pending approval{b.approvalsPending === 1 ? "" : "s"} and <span className="mono">{b.services.healthy}/{b.services.total}</span> services healthy.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* XAU desk */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Quant XAU Desk</div>
          <div className="mono text-3xl font-bold text-accent-amber">{b.xau.price.toFixed(2)}</div>
          <div className="grid grid-cols-3 gap-2">
            <Signal label="RSI" value={b.xau.rsi.value?.toFixed(1) ?? "—"} signal={b.xau.rsi.signal} />
            <Signal label="MACD" value={b.xau.macd.macd?.toFixed(2) ?? "—"} signal={b.xau.macd.trend} />
            <Signal label="EMA" value={b.xau.ema.ema50?.toFixed(0) ?? "—"} signal={b.xau.ema.signal} />
          </div>
          <div className="mono text-[10px] text-ink-dim">today&apos;s trading P&amp;L: <span className={b.trading.today >= 0 ? "text-accent-green" : "text-accent-red"}>{b.trading.today >= 0 ? "+" : ""}{b.trading.today.toFixed(2)}</span></div>
        </div>

        {/* Finance */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Finance · Yesterday</div>
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Income"  value={fmtTHB.format(b.finance.yesterday.income)}  tone="text-accent-green" />
            <Mini label="Expense" value={fmtTHB.format(b.finance.yesterday.expense)} tone="text-accent-red" />
            <Mini label="Net"     value={fmtTHB.format(b.finance.yesterday.net)}     tone={b.finance.yesterday.net >= 0 ? "text-accent-green" : "text-accent-red"} />
          </div>
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim mt-1">Hottest budgets · this month</div>
          {b.finance.hottestBudgets.length === 0 && <div className="mono text-[11px] text-ink-dim">No budgets configured.</div>}
          {b.finance.hottestBudgets.map((bg) => {
            const pct = Math.min(1.2, bg.pct);
            const tone = bg.pct >= 1 ? "bg-accent-red" : bg.pct >= 0.7 ? "bg-accent-amber" : "bg-accent-green";
            return (
              <div key={bg.category} className="flex flex-col gap-1">
                <div className="flex justify-between mono text-[11px]">
                  <span className="text-ink">{bg.category}</span>
                  <span className={bg.pct >= 1 ? "text-accent-red" : "text-ink-muted"}>{(bg.pct * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded bg-bg-raised overflow-hidden">
                  <div className={`h-full ${tone}`} style={{ width: `${(pct / 1.2) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top tasks */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Top Priorities</div>
          {b.tasks.length === 0 && <div className="mono text-[11px] text-ink-dim">Queue is empty. Enjoy the calm.</div>}
          {b.tasks.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="mono text-[10px] text-ink-dim w-4">{i + 1}.</span>
              <span className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${t.priority === "HIGH" ? "bg-accent-red/15 text-accent-red ring-accent-red/40" : t.priority === "MEDIUM" ? "bg-accent-amber/15 text-accent-amber ring-accent-amber/40" : "bg-accent-blue/15 text-accent-blue ring-accent-blue/40"}`}>
                {t.priority}
              </span>
              <span className="mono text-[11px] text-ink-muted">{t.module}</span>
              <span className="text-sm text-ink truncate flex-1">{t.title}</span>
            </div>
          ))}
        </div>

        {/* Status snapshot */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Status Snapshot</div>
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Approvals Pending" value={String(b.approvalsPending)} tone={b.approvalsPending > 0 ? "text-accent-purple" : "text-ink"} />
            <Mini label="Services Healthy" value={`${b.services.healthy}/${b.services.total}`} tone={b.services.healthy === b.services.total ? "text-accent-green" : "text-accent-amber"} />
          </div>
          <div className="mt-auto flex justify-end">
            <button
              onClick={load}
              disabled={loading}
              className="mono text-[10px] uppercase tracking-widest py-1.5 px-3 rounded border border-line text-ink-muted hover:text-ink"
            >
              {loading ? "refreshing…" : "refresh briefing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Signal({ label, value, signal }: { label: string; value: string; signal: string }) {
  return (
    <div className="bg-bg-raised rounded p-2 flex flex-col gap-1">
      <div className="mono text-[9px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className="mono text-sm font-bold text-ink">{value}</div>
      <div className={`mono text-[10px] font-bold ${SIGNAL_TONE[signal] ?? "text-ink-dim"}`}>{signal}</div>
    </div>
  );
}

function Mini({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-bg-raised rounded p-2 flex flex-col gap-1">
      <div className="mono text-[9px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-sm font-bold ${tone}`}>{value}</div>
    </div>
  );
}
