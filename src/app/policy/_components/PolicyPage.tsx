"use client";

import { useEffect, useState } from "react";

type Policy = {
  id: number;
  name: string;
  description: string;
  ruleType: string;
  threshold: number;
  enabled: boolean;
  violations: number;
};

type Violation = {
  id: number;
  ts: string;
  policyId: number;
  policyName: string;
  module: string;
  action: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  resolved: boolean;
  taskId: number | null;
  context: Record<string, unknown>;
};

const RULE_TYPES = ["MAX_TRADE_SIZE", "DAILY_LOSS", "SPEND_LIMIT", "DEVICE_QUOTA"] as const;

export function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState<string>(RULE_TYPES[0]);
  const [threshold, setThreshold] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    const [p, v] = await Promise.all([
      fetch("/api/policies", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/violations", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPolicies(p.policies);
    setViolations(v.violations);
  }
  useEffect(() => { loadAll(); }, []);

  async function toggle(p: Policy) {
    await fetch(`/api/policies/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !p.enabled }),
    });
    await loadAll();
  }

  async function remove(p: Policy) {
    if (!confirm(`Delete policy "${p.name}"?`)) return;
    await fetch(`/api/policies/${p.id}`, { method: "DELETE" });
    await loadAll();
  }

  async function updateThreshold(p: Policy, value: string) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    await fetch(`/api/policies/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: n }),
    });
    await loadAll();
  }

  async function addPolicy(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, ruleType, threshold: Number(threshold) || 0 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "add failed");
      }
      setName(""); setDescription(""); setThreshold("");
      setMsg("policy added");
      await loadAll();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  const enabledCount = policies.filter((p) => p.enabled).length;
  const totalViolations = policies.reduce((s, p) => s + p.violations, 0);
  const openViolations = violations.filter((v) => !v.resolved).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Active Policies" value={`${enabledCount} / ${policies.length}`} tone={enabledCount === policies.length ? "green" : "amber"} />
        <Stat label="Total Violations" value={String(totalViolations)} tone={totalViolations > 0 ? "red" : "neutral"} />
        <Stat label="Open Violations" value={String(openViolations)} tone={openViolations > 0 ? "amber" : "green"} />
        <Stat label="Rule Types" value={String(new Set(policies.map((p) => p.ruleType)).size)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="display text-sm font-semibold">Policies</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">{policies.length} configured</div>
          </div>
          {policies.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-dim mono text-xs">No policies yet.</div>
          )}
          {policies.map((p) => (
            <div key={p.id} className="px-4 py-3 border-b border-line/70 last:border-b-0 flex flex-wrap items-center gap-3">
              <button
                onClick={() => toggle(p)}
                className={`mono text-[10px] uppercase tracking-widest px-2 py-1 rounded ring-1 ${
                  p.enabled
                    ? "bg-accent-green/15 text-accent-green ring-accent-green/40"
                    : "bg-bg-raised text-ink-dim ring-line"
                }`}
              >
                {p.enabled ? "ON" : "OFF"}
              </button>
              <div className="flex-1 min-w-[180px]">
                <div className="mono text-sm font-bold">{p.name}</div>
                <div className="mono text-[11px] text-ink-muted">{p.description}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">Rule</div>
                <div className="mono text-xs text-accent-purple">{p.ruleType}</div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">Threshold</span>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={p.threshold}
                  onBlur={(e) => updateThreshold(p, e.target.value)}
                  className="input w-[120px] text-right"
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">Hits</span>
                <span className={`mono text-sm font-bold ${p.violations > 0 ? "text-accent-red" : "text-ink"}`}>{p.violations}</span>
              </div>
              <button
                onClick={() => remove(p)}
                className="mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-accent-red px-2"
                title="delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addPolicy} className="panel p-4 flex flex-col gap-3 h-fit">
          <div className="display text-sm font-semibold">Add Policy</div>
          <Field label="Name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Rule Type">
            <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className="input">
              {RULE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Threshold">
            <input required type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="input" />
          </Field>
          <Field label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="what it guards" />
          </Field>
          {msg && <div className="mono text-[11px] text-accent-green">{msg}</div>}
          <button
            type="submit"
            disabled={adding}
            className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 disabled:opacity-50"
          >
            {adding ? "adding…" : "add policy"}
          </button>
        </form>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Violation Log</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">{violations.length} recent</div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Time</th>
                <th className="text-left px-3 py-2 font-normal">Policy</th>
                <th className="text-left px-3 py-2 font-normal">Module · Action</th>
                <th className="text-left px-3 py-2 font-normal">Severity</th>
                <th className="text-left px-3 py-2 font-normal">Status</th>
                <th className="text-left px-3 py-2 font-normal">Reason</th>
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-dim mono text-xs">No violations recorded.</td></tr>
              )}
              {violations.map((v) => {
                const tone = v.severity === "HIGH" ? "text-accent-red" : v.severity === "MEDIUM" ? "text-accent-amber" : "text-ink-muted";
                const reason = typeof v.context === "object" && v.context !== null && "reason" in v.context ? String((v.context as Record<string, unknown>).reason) : "—";
                return (
                  <tr key={v.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{new Date(v.ts).toLocaleString("en-GB")}</td>
                    <td className="px-3 py-2 mono text-[11px] text-accent-purple">{v.policyName}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink">{v.module} · {v.action}</td>
                    <td className={`px-3 py-2 mono text-[11px] font-bold ${tone}`}>{v.severity}</td>
                    <td className="px-3 py-2 mono text-[11px]">{v.resolved ? <span className="text-accent-green">resolved</span> : <span className="text-accent-amber">open</span>}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted truncate max-w-[320px]">{reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .input {
          background: #0a0c10;
          border: 1px solid #1f242d;
          border-radius: 6px;
          padding: 6px 10px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
          color: #e6e9ef;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #B794F4;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "red" | "amber" | "neutral" }) {
  const map = { green: "text-accent-green", red: "text-accent-red", amber: "text-accent-amber", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
    </div>
  );
}
