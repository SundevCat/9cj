"use client";

import { useEffect, useState } from "react";

type Task = {
  id: number;
  createdAt: string;
  title: string;
  module: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "APPROVED" | "REJECTED" | "DONE";
  metadata: {
    ctx?: {
      module?: string;
      action?: string;
      size?: number;
      pnl?: number;
      description?: string;
      raw?: Record<string, unknown>;
    };
    hits?: Array<{ name: string; reason: string; severity: string; ruleType: string }>;
  } | string | null;
};

const PRIORITY_TONE: Record<string, string> = {
  HIGH:   "bg-accent-red/15 text-accent-red ring-accent-red/40",
  MEDIUM: "bg-accent-amber/15 text-accent-amber ring-accent-amber/40",
  LOW:    "bg-accent-blue/15 text-accent-blue ring-accent-blue/40",
};

export function ApprovalsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const j = await res.json();
    setTasks(j.tasks);
  }
  useEffect(() => { load(); }, []);

  async function decide(t: Task, status: "APPROVED" | "REJECTED") {
    const label = status === "APPROVED" ? "APPROVE" : "REJECT";
    if (!confirm(`${label} "${t.title}"?`)) return;
    setBusy(t.id);
    try {
      await fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const pending = tasks.filter((t) => t.status === "PENDING");
  const history = tasks.filter((t) => t.status !== "PENDING").slice(0, 50);

  const highCount = pending.filter((t) => t.priority === "HIGH").length;
  const approved = tasks.filter((t) => t.status === "APPROVED").length;
  const rejected = tasks.filter((t) => t.status === "REJECTED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={String(pending.length)} tone={pending.length > 0 ? "amber" : "neutral"} hint={`${highCount} high priority`} />
        <Stat label="Approved (all)" value={String(approved)} tone="green" />
        <Stat label="Rejected (all)" value={String(rejected)} tone="red" />
        <Stat label="Total Handled" value={String(approved + rejected)} hint="approval throughput" />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Approval Queue</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">{pending.length} pending</div>
        </div>
        {pending.length === 0 && (
          <div className="px-4 py-12 text-center text-ink-dim mono text-xs">
            Queue empty. Trigger one by submitting a trade larger than the MAX_TRADE_SIZE policy threshold.
          </div>
        )}
        {pending.map((t) => {
          const md = typeof t.metadata === "object" && t.metadata !== null ? t.metadata : null;
          const ctx = md?.ctx;
          const hits = md?.hits ?? [];
          return (
            <div key={t.id} className="px-4 py-3 border-b border-line/70 last:border-b-0 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1">
                  <span className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ring-1 mt-0.5 ${PRIORITY_TONE[t.priority]}`}>
                    {t.priority}
                  </span>
                  <div className="flex flex-col gap-1">
                    <div className="mono text-sm font-bold">{t.title}</div>
                    <div className="mono text-[11px] text-ink-muted">
                      {new Date(t.createdAt).toLocaleString("en-GB")} · {t.module}
                      {ctx?.size !== undefined && <> · size {ctx.size}</>}
                      {ctx?.description && <> · {ctx.description}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(t, "REJECTED")}
                    disabled={busy === t.id}
                    className="mono text-xs uppercase tracking-widest py-2 px-4 rounded bg-accent-red/15 text-accent-red border border-accent-red/40 hover:bg-accent-red/25 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => decide(t, "APPROVED")}
                    disabled={busy === t.id}
                    className="mono text-xs uppercase tracking-widest py-2 px-4 rounded bg-accent-green/15 text-accent-green border border-accent-green/40 hover:bg-accent-green/25 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
              {hits.length > 0 && (
                <div className="bg-bg-raised/60 rounded p-2 flex flex-col gap-1">
                  <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">Why it's flagged</div>
                  {hits.map((h, i) => (
                    <div key={i} className="mono text-[11px]">
                      <span className="text-accent-purple">{h.name}</span>
                      <span className="text-ink-dim"> · </span>
                      <span className="text-ink-muted">{h.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">History</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">last {history.length}</div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Time</th>
                <th className="text-left px-3 py-2 font-normal">Module</th>
                <th className="text-left px-3 py-2 font-normal">Title</th>
                <th className="text-left px-3 py-2 font-normal">Priority</th>
                <th className="text-left px-3 py-2 font-normal">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-dim mono text-xs">No history yet.</td></tr>
              )}
              {history.map((t) => {
                const outcomeTone = t.status === "APPROVED" ? "text-accent-green" : t.status === "REJECTED" ? "text-accent-red" : "text-ink-muted";
                return (
                  <tr key={t.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{new Date(t.createdAt).toLocaleString("en-GB")}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink">{t.module}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink truncate max-w-[260px]">{t.title}</td>
                    <td className="px-3 py-2 mono text-[11px]">{t.priority}</td>
                    <td className={`px-3 py-2 mono text-[11px] font-bold ${outcomeTone}`}>{t.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral", hint }: { label: string; value: string; tone?: "green" | "red" | "amber" | "neutral"; hint?: string }) {
  const map = { green: "text-accent-green", red: "text-accent-red", amber: "text-accent-amber", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
      {hint && <div className="mono text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}
