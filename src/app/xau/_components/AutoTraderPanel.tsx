"use client";

import { useEffect, useState } from "react";

type Config = {
  enabled: boolean;
  strategy: "CONSENSUS";
  size: number;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  cooldownSec: number;
};

type State = {
  lastActionAt: string | null;
  openTradeId: number | null;
  lastDirection: "LONG" | "SHORT" | null;
  lastDecision: string | null;
};

export function AutoTraderPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form drafts (kept separate so user edits don't get overwritten by poll)
  const [size, setSize] = useState("");
  const [slPct, setSlPct] = useState("");
  const [tpPct, setTpPct] = useState("");
  const [cooldown, setCooldown] = useState("");

  async function load(initial = false) {
    const res = await fetch("/api/autotrader", { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as { config: Config; state: State };
    setConfig(j.config);
    setState(j.state);
    if (initial) {
      setSize(String(j.config.size));
      setSlPct(j.config.stopLossPct === null ? "" : String(j.config.stopLossPct));
      setTpPct(j.config.takeProfitPct === null ? "" : String(j.config.takeProfitPct));
      setCooldown(String(j.config.cooldownSec));
    }
  }

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 5000);
    return () => clearInterval(id);
  }, []);

  async function patch(body: Partial<Config>) {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/autotrader", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      await load(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    if (!config) return;
    if (!config.enabled) {
      const ok = confirm(
        "Enable auto-trader?\n\n" +
        `It will place LIVE orders on Capital.com when RSI + MACD + EMA all agree.\n` +
        `Size per trade: ${config.size} contracts. Cooldown: ${config.cooldownSec}s.\n\n` +
        `Policy guardrails still apply — oversized trades will be queued for HIL.`
      );
      if (!ok) return;
    }
    await patch({ enabled: !config.enabled });
  }

  async function saveParams() {
    await patch({
      size: Number(size) || 0.1,
      stopLossPct: slPct === "" ? null : Number(slPct),
      takeProfitPct: tpPct === "" ? null : Number(tpPct),
      cooldownSec: Number(cooldown) || 30,
    });
  }

  async function kill() {
    if (!confirm("Kill switch: disable auto-trader. Open auto-trades stay open (close them in Capital or via the journal).")) return;
    await patch({ enabled: false });
  }

  if (!config || !state) {
    return <div className="panel p-4 mono text-xs text-ink-dim">Loading auto-trader…</div>;
  }

  const enabledTone = config.enabled
    ? "bg-accent-green/15 text-accent-green border-accent-green/40"
    : "bg-bg-raised text-ink-muted border-line";

  const stateBadge = state.openTradeId
    ? state.lastDirection === "LONG"
      ? { label: `HOLDING LONG · trade #${state.openTradeId}`, tone: "bg-accent-green/15 text-accent-green ring-accent-green/40" }
      : { label: `HOLDING SHORT · trade #${state.openTradeId}`, tone: "bg-accent-red/15 text-accent-red ring-accent-red/40" }
    : { label: "IDLE · no open position", tone: "bg-bg-raised text-ink-muted ring-line" };

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="display text-base font-semibold text-accent-purple">Auto-Trader</div>
          <span className={`mono text-[10px] uppercase tracking-widest px-2 py-1 rounded ring-1 ${stateBadge.tone}`}>
            {stateBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            disabled={saving}
            className={`mono text-xs uppercase tracking-widest py-2 px-4 rounded border transition-colors disabled:opacity-50 ${enabledTone}`}
          >
            {config.enabled ? "● ON" : "○ OFF"}
          </button>
          {config.enabled && (
            <button
              onClick={kill}
              className="mono text-xs uppercase tracking-widest py-2 px-3 rounded bg-accent-red/15 text-accent-red border border-accent-red/40 hover:bg-accent-red/25"
            >
              Kill
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Strategy">
          <select className="input" value={config.strategy} disabled>
            <option value="CONSENSUS">CONSENSUS</option>
          </select>
        </Field>
        <Field label="Size (contracts)">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </Field>
        <Field label="Stop-Loss %">
          <input
            className="input"
            type="number"
            step="0.1"
            min="0"
            placeholder="off"
            value={slPct}
            onChange={(e) => setSlPct(e.target.value)}
          />
        </Field>
        <Field label="Take-Profit %">
          <input
            className="input"
            type="number"
            step="0.1"
            min="0"
            placeholder="off"
            value={tpPct}
            onChange={(e) => setTpPct(e.target.value)}
          />
        </Field>
        <Field label="Cooldown (sec)">
          <input
            className="input"
            type="number"
            step="1"
            min="0"
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-3 flex items-end">
          <button
            onClick={saveParams}
            disabled={saving}
            className="mono text-xs uppercase tracking-widest py-2 px-4 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 disabled:opacity-50"
          >
            {saving ? "saving…" : "save params"}
          </button>
        </div>
      </div>

      <div className="bg-bg-raised/60 rounded p-3 flex flex-col gap-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">Last decision</div>
        <div className="mono text-[11px] text-ink">{state.lastDecision ?? "no decisions yet"}</div>
        <div className="mono text-[10px] text-ink-dim">
          last action: {state.lastActionAt ? new Date(state.lastActionAt).toLocaleString("en-GB") : "never"}
          {" · "}strategy: {config.strategy} (RSI + MACD + EMA all agree)
        </div>
      </div>

      {err && <div className="mono text-[11px] text-accent-red">{err}</div>}

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
        .input:disabled {
          opacity: 0.7;
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
