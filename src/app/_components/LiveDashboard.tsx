"use client";

import { useEffect, useState } from "react";
import { useStream } from "@/components/stream/StreamProvider";
import { MetricCard } from "@/components/ui/MetricCard";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { LogEntry } from "@/components/ui/LogEntry";

const MODULES = [
  { title: "AI Agents",         description: "Task queue, multi-agent routing, activity feed.",       href: "/agents",      tone: "green"  as const, status: "READY" },
  { title: "Quant XAU Desk",    description: "Live gold price, RSI/MACD/EMA signals, trade journal.", href: "/xau",         tone: "amber"  as const, status: "LIVE"  },
  { title: "Backtest Lab",      description: "Run RSI/MACD/EMA strategies on historical OHLCV.",      href: "/backtest",    tone: "purple" as const, status: "READY" },
  { title: "Finance / P&L",     description: "Income, expenses, budget vs actuals, portfolio mix.",   href: "/finance",     tone: "green"  as const, status: "READY" },
  { title: "Smart Home Ops",    description: "Home Assistant devices, modes, energy usage.",          href: "/home-ops",    tone: "blue"   as const, status: "READY" },
  { title: "ProductOps",        description: "Kanban board for personal product/project work.",       href: "/product-ops", tone: "blue"   as const, status: "READY" },
  { title: "DevOps",            description: "Uptime monitor, deploy log, service health grid.",      href: "/devops",      tone: "blue"   as const, status: "READY" },
  { title: "Memory / Audit",    description: "Searchable log of every decision, action, and event.",  href: "/memory",      tone: "purple" as const, status: "READY" },
  { title: "Policy Governance", description: "Define rules. Block actions. Log violations.",          href: "/policy",      tone: "purple" as const, status: "READY" },
  { title: "Human-in-Loop",     description: "Approval queue for actions flagged by policy.",         href: "/approvals",   tone: "amber"  as const, status: "READY" },
];

export function LiveDashboard() {
  const { connected, price, metrics, feed } = useStream();

  // Seed the feed from history so first paint isn't empty.
  const [seeded, setSeeded] = useState<typeof feed>([]);
  useEffect(() => {
    if (feed.length > 0 || seeded.length > 0) return;
    fetch("/api/memories?limit=15", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSeeded(j.memories ?? []));
  }, [feed.length, seeded.length]);

  const merged = feed.length > 0 ? feed : seeded;

  const priceTone = !price ? "neutral" : price.delta >= 0 ? "green" : "red";
  const priceDelta = price ? `${price.delta >= 0 ? "+" : ""}${price.delta.toFixed(2)}` : undefined;
  const servicesValue = metrics ? `${metrics.servicesHealthy} / ${metrics.servicesTotal}` : "—";
  const servicesTone = metrics && metrics.servicesTotal > 0 && metrics.servicesHealthy === metrics.servicesTotal ? "green" : "amber";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Overview · Bangkok · live via SSE · {connected ? "stream connected" : "stream offline"}
          </p>
        </div>
        <div className="mono text-[11px] text-ink-dim">
          {new Date().toLocaleTimeString("en-GB", { hour12: false })}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="XAU / USD"
          value={price ? price.value.toFixed(2) : "—"}
          delta={priceDelta}
          tone={priceTone === "green" ? "green" : priceTone === "red" ? "red" : "amber"}
          hint={price ? `source: ${price.source}` : "waiting…"}
        />
        <MetricCard
          label="Stream Health"
          value={connected ? "ONLINE" : "OFFLINE"}
          tone={connected ? "green" : "red"}
          hint="SSE · 5s pulse"
        />
        <MetricCard
          label="Open Approvals"
          value={metrics ? String(metrics.approvalsPending) : "—"}
          tone={metrics && metrics.approvalsPending > 0 ? "purple" : "neutral"}
          hint="human-in-loop"
        />
        <MetricCard
          label="Services Healthy"
          value={servicesValue}
          tone={servicesTone}
          hint={metrics ? `100-bar perf ${metrics.pricePerf >= 0 ? "+" : ""}${metrics.pricePerf.toFixed(2)}%` : "—"}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="display text-lg font-semibold">Modules</h2>
          <span className="mono text-[10px] text-ink-dim uppercase tracking-widest">11 total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULES.map((m) => <ModuleCard key={m.href} {...m} />)}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="display text-lg font-semibold">Agent Activity</h2>
          <span className="mono text-[10px] text-ink-dim uppercase tracking-widest">
            live · {merged.length} entries
          </span>
        </div>
        <div className="panel">
          {merged.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-dim mono text-xs">
              Waiting for the first memory event…
            </div>
          )}
          {merged.slice(0, 12).map((m) => (
            <LogEntry
              key={m.id}
              time={new Date(m.createdAt)}
              agent={m.agent}
              tag={m.tag}
              message={m.message}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
