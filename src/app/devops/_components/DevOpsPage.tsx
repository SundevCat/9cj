"use client";

import { useEffect, useState } from "react";

type Service = {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  last: { ts: string; ok: boolean; status: number | null; latencyMs: number | null; error: string | null } | null;
  uptime: number | null;
  avgLatency: number | null;
  history: { ts: string; ok: boolean; latencyMs: number | null }[];
};

type Deploy = {
  id: number;
  ts: string;
  service: string;
  version: string | null;
  status: "OK" | "FAIL" | "ROLLBACK";
  notes: string | null;
};

export function DevOpsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [deployService, setDeployService] = useState("");
  const [deployVersion, setDeployVersion] = useState("");
  const [deployNotes, setDeployNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function loadAll() {
    const [s, d] = await Promise.all([
      fetch("/api/devops/services", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/devops/deploys", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setServices(s.services);
    setDeploys(d.deploys);
  }

  useEffect(() => { loadAll(); }, []);

  async function checkAll() {
    setChecking(true);
    setMsg(null);
    try {
      const res = await fetch("/api/devops/check-all", { method: "POST" });
      const j = await res.json();
      setMsg(`Checked ${j.checked} services`);
      await loadAll();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function seedDemo() {
    await fetch("/api/devops/seed-demo", { method: "POST" });
    await loadAll();
    setMsg("Demo services loaded — click CHECK ALL to ping.");
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/devops/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "add failed");
      }
      setName(""); setUrl("");
      await loadAll();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function removeService(id: number) {
    await fetch(`/api/devops/services/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function logDeploy(e: React.FormEvent) {
    e.preventDefault();
    if (!deployService) return;
    await fetch("/api/devops/deploys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: deployService, version: deployVersion, notes: deployNotes, status: "OK" }),
    });
    setDeployVersion(""); setDeployNotes("");
    await loadAll();
  }

  const healthy = services.filter((s) => s.last?.ok).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Services" value={String(services.length)} />
        <Stat label="Healthy" value={`${healthy} / ${services.length}`} tone={healthy === services.length ? "green" : "amber"} />
        <Stat label="Deploys (50)" value={String(deploys.length)} />
        <button
          onClick={checkAll}
          disabled={checking || services.length === 0}
          className="panel p-4 flex flex-col gap-1 text-left hover:border-accent-blue/40 transition-colors disabled:opacity-60"
        >
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">Action</div>
          <div className="mono text-xl font-bold text-accent-blue">{checking ? "PINGING…" : "CHECK ALL"}</div>
          <div className="mono text-[10px] text-ink-dim">{msg ?? "ping every enabled service"}</div>
        </button>
      </div>

      {services.length === 0 && (
        <div className="panel p-6 text-center flex flex-col gap-2">
          <div className="display text-lg">No services registered.</div>
          <div className="mono text-[11px] text-ink-dim">Add one below or load a demo set.</div>
          <div>
            <button
              onClick={seedDemo}
              className="mono text-xs uppercase tracking-widest py-2 px-3 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25"
            >
              load demo services
            </button>
          </div>
        </div>
      )}

      {/* Services grid */}
      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {services.map((s) => {
            const okTone = !s.last
              ? "text-ink-dim"
              : s.last.ok
                ? "text-accent-green"
                : "text-accent-red";
            const dotTone = !s.last ? "bg-ink-dim" : s.last.ok ? "bg-accent-green" : "bg-accent-red";
            return (
              <div key={s.id} className="panel p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotTone}`} />
                    <div className="mono text-sm font-bold">{s.name}</div>
                  </div>
                  <button
                    onClick={() => removeService(s.id)}
                    className="mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-accent-red"
                    title="delete"
                  >
                    ✕
                  </button>
                </div>
                <div className="mono text-[10px] text-ink-muted truncate">{s.url}</div>

                <div className="grid grid-cols-3 gap-2">
                  <Mini label="Status" value={s.last ? (s.last.ok ? "OK" : "ERR") : "—"} tone={okTone} />
                  <Mini label="Latency" value={s.last?.latencyMs != null ? `${s.last.latencyMs}ms` : "—"} />
                  <Mini label="Uptime" value={s.uptime != null ? `${(s.uptime * 100).toFixed(0)}%` : "—"} />
                </div>

                {/* Sparkline */}
                {s.history.length > 1 ? (
                  <Sparkline points={s.history} />
                ) : (
                  <div className="mono text-[10px] text-ink-dim">
                    {s.last ? `last check ${new Date(s.last.ts).toLocaleTimeString("en-GB")}` : "not checked yet"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add service + deploy log forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <form onSubmit={addService} className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Add Service</div>
          <Field label="Name">
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="my-api" />
          </Field>
          <Field label="URL">
            <input className="input" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/health" />
          </Field>
          <button
            type="submit"
            disabled={adding}
            className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/40 hover:bg-accent-blue/25 disabled:opacity-50"
          >
            {adding ? "adding…" : "add service"}
          </button>
        </form>

        <form onSubmit={logDeploy} className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Log Deploy</div>
          <Field label="Service">
            <input className="input" list="svc-options" required value={deployService} onChange={(e) => setDeployService(e.target.value)} placeholder="9cj-app" />
            <datalist id="svc-options">
              {services.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </Field>
          <Field label="Version">
            <input className="input" value={deployVersion} onChange={(e) => setDeployVersion(e.target.value)} placeholder="v0.4.0" />
          </Field>
          <Field label="Notes">
            <input className="input" value={deployNotes} onChange={(e) => setDeployNotes(e.target.value)} placeholder="what changed" />
          </Field>
          <button
            type="submit"
            className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-green/15 text-accent-green border border-accent-green/40 hover:bg-accent-green/25"
          >
            log deploy
          </button>
        </form>
      </div>

      {/* Deploy log */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Deploy Log</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">last {deploys.length}</div>
        </div>
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Time</th>
                <th className="text-left px-3 py-2 font-normal">Service</th>
                <th className="text-left px-3 py-2 font-normal">Version</th>
                <th className="text-left px-3 py-2 font-normal">Status</th>
                <th className="text-left px-3 py-2 font-normal">Notes</th>
              </tr>
            </thead>
            <tbody>
              {deploys.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-dim mono text-xs">No deploys logged.</td></tr>
              )}
              {deploys.map((d) => {
                const tone = d.status === "OK" ? "text-accent-green" : d.status === "FAIL" ? "text-accent-red" : "text-accent-amber";
                return (
                  <tr key={d.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{new Date(d.ts).toLocaleString("en-GB")}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink">{d.service}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{d.version ?? "—"}</td>
                    <td className={`px-3 py-2 mono text-[11px] font-bold ${tone}`}>{d.status}</td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted truncate max-w-[400px]">{d.notes ?? ""}</td>
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
          font-size: 13px;
          color: #e6e9ef;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #63B3ED;
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

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "amber" | "red" | "neutral" }) {
  const map = { green: "text-accent-green", amber: "text-accent-amber", red: "text-accent-red", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-bg-raised rounded px-2 py-1 flex flex-col gap-0.5">
      <span className="mono text-[9px] uppercase tracking-widest text-ink-dim">{label}</span>
      <span className={`mono text-xs font-bold ${tone || "text-ink"}`}>{value}</span>
    </div>
  );
}

function Sparkline({ points }: { points: { ts: string; ok: boolean; latencyMs: number | null }[] }) {
  const w = 280;
  const h = 28;
  const vals = points.map((p) => p.latencyMs ?? 0);
  const max = Math.max(...vals, 1);
  const xStep = vals.length > 1 ? w / (vals.length - 1) : 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7">
      {points.map((p, i) => {
        const x = i * xStep;
        const v = p.latencyMs ?? 0;
        const barH = Math.max(2, (v / max) * (h - 4));
        return (
          <rect
            key={i}
            x={x}
            y={h - barH}
            width={Math.max(2, xStep - 1)}
            height={barH}
            className={p.ok ? "fill-accent-green/70" : "fill-accent-red/70"}
          />
        );
      })}
    </svg>
  );
}
