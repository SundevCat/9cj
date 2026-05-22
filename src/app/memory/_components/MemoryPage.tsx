"use client";

import { useEffect, useMemo, useState } from "react";

type Memory = {
  id: number;
  createdAt: string;
  agent: string;
  tag: string;
  message: string;
  metadata: string | null;
};

type Metrics = {
  total: number;
  shown: number;
  oldest: string | null;
  agents: string[];
  tags: string[];
};

const TAG_TONE: Record<string, string> = {
  TRADE:  "bg-accent-blue/15 text-accent-blue ring-accent-blue/30",
  POLICY: "bg-accent-purple/15 text-accent-purple ring-accent-purple/30",
  AI:     "bg-accent-green/15 text-accent-green ring-accent-green/30",
  SYS:    "bg-ink-muted/15 text-ink-muted ring-ink-muted/30",
  OK:     "bg-accent-green/15 text-accent-green ring-accent-green/30",
  WARN:   "bg-accent-amber/15 text-accent-amber ring-accent-amber/30",
  ERR:    "bg-accent-red/15 text-accent-red ring-accent-red/30",
};

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("");
  const [agent, setAgent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (tag) sp.set("tag", tag);
    if (agent) sp.set("agent", agent);
    sp.set("limit", "200");
    try {
      const res = await fetch(`/api/memories?${sp.toString()}`, { cache: "no-store" });
      const j = await res.json();
      setMemories(j.memories);
      setMetrics(j.metrics);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  // Debounced refetch on search/filter change
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tag, agent]);

  const decisions = useMemo(() => memories.filter((m) => m.tag === "POLICY" || m.tag === "AI").length, [memories]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Memories" value={metrics ? metrics.total.toLocaleString() : "—"} />
        <Stat label="Shown" value={String(memories.length)} hint={loading ? "loading…" : "after filters"} />
        <Stat label="Decisions Logged" value={String(decisions)} tone="purple" hint="POLICY + AI" />
        <Stat label="Oldest Entry" value={metrics?.oldest ? new Date(metrics.oldest).toLocaleDateString("en-GB") : "—"} tone="amber" />
      </div>

      <div className="panel p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search messages, agents, metadata…"
            className="input flex-1 min-w-[220px]"
          />
          <select value={agent} onChange={(e) => setAgent(e.target.value)} className="input w-[200px]">
            <option value="">all agents</option>
            {metrics?.agents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => { setSearch(""); setTag(""); setAgent(""); }}
            className="mono text-[11px] uppercase tracking-widest px-3 py-2 rounded border border-line text-ink-muted hover:text-ink"
          >
            reset
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["", ...(metrics?.tags ?? [])]).map((t) => {
            const active = tag === t;
            const tone = t ? (TAG_TONE[t] ?? "bg-bg-raised text-ink-muted ring-line") : "bg-bg-raised text-ink ring-line";
            return (
              <button
                key={t || "all"}
                onClick={() => setTag(t)}
                className={`mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded ring-1 transition-all ${tone} ${active ? "scale-105" : "opacity-70 hover:opacity-100"}`}
              >
                {t || "all tags"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Live Feed</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">newest first</div>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {memories.length === 0 && (
            <div className="px-4 py-12 text-center text-ink-dim mono text-xs">
              No memories match — try clearing filters or seeding demo data on the AI Agents page.
            </div>
          )}
          {memories.map((m) => {
            const tone = TAG_TONE[m.tag] ?? TAG_TONE.SYS;
            return (
              <div key={m.id} className="flex items-start gap-3 px-3 py-2 border-b border-line/70 last:border-b-0 hover:bg-bg-raised/40 transition-colors">
                <span className="mono text-[11px] text-ink-dim tabular-nums shrink-0 w-24">
                  {new Date(m.createdAt).toLocaleTimeString("en-GB")}
                </span>
                <span className={`mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 ${tone} shrink-0`}>{m.tag}</span>
                <span className="mono text-[11px] text-ink-muted shrink-0 w-32 truncate">{m.agent}</span>
                <span className="text-sm text-ink flex-1 truncate">{m.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .input {
          background: #0a0c10;
          border: 1px solid #1f242d;
          border-radius: 6px;
          padding: 7px 10px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          color: #e6e9ef;
        }
        .input:focus {
          outline: none;
          border-color: #63B3ED;
        }
      `}</style>
    </div>
  );
}

function Stat({
  label, value, tone = "neutral", hint,
}: { label: string; value: string; tone?: "green" | "red" | "amber" | "purple" | "neutral"; hint?: string }) {
  const map = { green: "text-accent-green", red: "text-accent-red", amber: "text-accent-amber", purple: "text-accent-purple", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
      {hint && <div className="mono text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}
