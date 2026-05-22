"use client";

import { useEffect, useState } from "react";

type Task = {
  id: number;
  createdAt: string;
  title: string;
  module: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "APPROVED" | "REJECTED" | "DONE";
};

type Memory = {
  id: number;
  createdAt: string;
  agent: string;
  tag: string;
  message: string;
};

const PRIORITY_TONE: Record<string, string> = {
  HIGH:   "bg-accent-red/15 text-accent-red ring-accent-red/40",
  MEDIUM: "bg-accent-amber/15 text-accent-amber ring-accent-amber/40",
  LOW:    "bg-accent-blue/15 text-accent-blue ring-accent-blue/40",
};
const STATUS_TONE: Record<string, string> = {
  PENDING:  "text-accent-amber",
  APPROVED: "text-accent-green",
  REJECTED: "text-accent-red",
  DONE:     "text-ink-muted",
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

const MODULES = [
  { id: "xau",       label: "Quant XAU Desk", tone: "amber"  },
  { id: "finance",   label: "Finance / P&L",  tone: "green"  },
  { id: "home-ops",  label: "Smart Home",     tone: "blue"   },
  { id: "devops",    label: "DevOps",         tone: "blue"   },
  { id: "policy",    label: "Policy",         tone: "purple" },
  { id: "system",    label: "System",         tone: "neutral" },
];

export function AgentsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("xau");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    const [t, m] = await Promise.all([
      fetch("/api/tasks", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/memories?limit=50", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setTasks(t.tasks);
    setMemories(m.memories);
  }
  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 10_000);
    return () => clearInterval(id);
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, module, priority }),
      });
      setTitle("");
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  async function seedDemo() {
    setSubmitting(true);
    try {
      await fetch("/api/phase4/seed-demo", { method: "POST" });
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  const pending = tasks.filter((t) => t.status === "PENDING");
  const queueByModule = MODULES.map((m) => ({
    ...m,
    count: tasks.filter((t) => t.module === m.id).length,
    pending: pending.filter((t) => t.module === m.id).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Tasks" value={String(tasks.length)} />
        <Stat label="Pending" value={String(pending.length)} tone={pending.length > 0 ? "amber" : "neutral"} hint={`${pending.filter((t) => t.priority === "HIGH").length} HIGH`} />
        <Stat label="Memory Events" value={String(memories.length)} tone="purple" hint="last 50 shown" />
        <button
          onClick={seedDemo}
          disabled={submitting}
          className="panel p-4 flex flex-col gap-1 text-left hover:border-accent-purple/40 transition-colors disabled:opacity-60"
        >
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">Action</div>
          <div className="mono text-xl font-bold text-accent-purple">LOAD DEMO</div>
          <div className="mono text-[10px] text-ink-dim">policies + kanban + memories</div>
        </button>
      </div>

      {/* Module router map */}
      <div className="panel p-4 flex flex-col gap-3">
        <div className="display text-sm font-semibold">Module Router</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {queueByModule.map((m) => (
            <div key={m.id} className="bg-bg-raised rounded p-3 flex flex-col gap-1 border border-line">
              <div className="mono text-xs text-ink truncate">{m.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="mono text-2xl font-bold text-ink">{m.count}</span>
                <span className="mono text-[10px] text-ink-dim">tasks</span>
              </div>
              {m.pending > 0 && (
                <div className="mono text-[10px] text-accent-amber">{m.pending} pending</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* Task queue */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="display text-sm font-semibold">Task Queue</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">priority-sorted</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {tasks.length === 0 && (
              <div className="px-4 py-8 text-center text-ink-dim mono text-xs">No tasks. Add one →</div>
            )}
            {tasks.map((t) => (
              <div key={t.id} className="px-4 py-2 border-b border-line/70 last:border-b-0 flex items-center gap-3">
                <span className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${PRIORITY_TONE[t.priority]}`}>
                  {t.priority}
                </span>
                <span className="mono text-[11px] text-ink-muted shrink-0 w-20">{t.module}</span>
                <span className="text-sm text-ink flex-1 truncate">{t.title}</span>
                <span className={`mono text-[10px] uppercase tracking-widest ${STATUS_TONE[t.status]}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add task */}
        <form onSubmit={addTask} className="panel p-4 flex flex-col gap-3 h-fit">
          <div className="display text-sm font-semibold">Queue Task</div>
          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="what should an agent do?" />
          </Field>
          <Field label="Module">
            <select value={module} onChange={(e) => setModule(e.target.value)} className="input">
              {MODULES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <div className="grid grid-cols-3 gap-2">
              {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`mono text-[10px] uppercase tracking-widest py-2 rounded border transition-colors ${
                    priority === p
                      ? PRIORITY_TONE[p].replace("ring-1 ", "") + " border-current"
                      : "bg-bg-raised border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-green/15 text-accent-green border border-accent-green/40 hover:bg-accent-green/25 disabled:opacity-50"
          >
            {submitting ? "queuing…" : "queue task"}
          </button>
        </form>
      </div>

      {/* Agent activity feed */}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Agent Activity</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">auto-refresh 10s</div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {memories.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-dim mono text-xs">No activity yet.</div>
          )}
          {memories.map((m) => {
            const tone = TAG_TONE[m.tag] ?? TAG_TONE.SYS;
            return (
              <div key={m.id} className="flex items-start gap-3 px-3 py-2 border-b border-line/70 last:border-b-0 hover:bg-bg-raised/40 transition-colors">
                <span className="mono text-[11px] text-ink-dim tabular-nums shrink-0 w-24">{new Date(m.createdAt).toLocaleTimeString("en-GB")}</span>
                <span className={`mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 ${tone} shrink-0`}>{m.tag}</span>
                <span className="mono text-[11px] text-ink-muted shrink-0 w-32 truncate">{m.agent}</span>
                <span className="text-sm text-ink truncate flex-1">{m.message}</span>
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
          font-size: 13px;
          color: #e6e9ef;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #68D391;
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

function Stat({ label, value, tone = "neutral", hint }: { label: string; value: string; tone?: "green" | "red" | "amber" | "purple" | "neutral"; hint?: string }) {
  const map = { green: "text-accent-green", red: "text-accent-red", amber: "text-accent-amber", purple: "text-accent-purple", neutral: "text-ink" };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
      {hint && <div className="mono text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}
