"use client";

import { useEffect, useState } from "react";

type Strategy = "CONSENSUS" | "MAJORITY_2OF3";

type Config = {
  enabled: boolean;
  strategy: Strategy;
  size: number;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  cooldownSec: number;
};

const STRATEGY_OPTIONS: { id: Strategy; label: string; desc: string }[] = [
  { id: "CONSENSUS",     label: "CONSENSUS (3/3)",  desc: "All 3 indicators must agree · strict · few trades" },
  { id: "MAJORITY_2OF3", label: "MAJORITY (2/3)",   desc: "Any 2 agree (no opposing 3rd) · moderate · more trades" },
];

type State = {
  lastActionAt: string | null;
  openTradeId: string | null;
  lastDirection: "LONG" | "SHORT" | null;
  lastDecision: string | null;
};

type Signal = "BUY" | "SELL" | "NEUTRAL";

type Status = {
  config: Config;
  state: State;
  cooldownRemaining: number;
  candleCount: number;
  signals: {
    rsi: { value: number | null; signal: Signal; period: number };
    macd: { macd: number | null; signal: number | null; histogram: number | null; trend: Signal };
    ema: { ema50: number | null; ema200: number | null; signal: Signal };
  } | null;
  votes: { buy: number; sell: number; neutral: number };
  verdict: Signal;
  verdictReason: string;
  openTradeId: string | null;
  openTradeDirection: "LONG" | "SHORT" | null;
  nextAction: { action: string; detail: string };
  asOf: string;
};

type Policy = {
  id: string;
  name: string;
  ruleType: string;
  threshold: number;
  enabled: boolean;
};

type AccountInfo = { name?: string; accountId?: string; currency?: string };

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

  // Brain — live status, polled every 2s
  const [status, setStatus] = useState<Status | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0); // local 1s tick for smooth countdown

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

  async function loadStatus() {
    try {
      const res = await fetch("/api/autotrader/status", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as Status);
    } catch {/* poll keeps going */}
  }
  async function loadPolicies() {
    try {
      const res = await fetch("/api/policies", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { policies: Policy[] };
        setPolicies(j.policies);
      }
    } catch {/* non-fatal */}
  }
  async function loadAccount() {
    try {
      const res = await fetch("/api/broker/account", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { live?: AccountInfo };
        if (j.live) setAccount(j.live);
      }
    } catch {/* non-fatal */}
  }

  useEffect(() => {
    load(true);
    loadStatus();
    loadPolicies();
    loadAccount();
    const cfgId = setInterval(() => load(false), 5000);
    const statusId = setInterval(loadStatus, 2000);
    const tickId = setInterval(() => setCooldownTick((t) => t + 1), 1000);
    return () => {
      clearInterval(cfgId);
      clearInterval(statusId);
      clearInterval(tickId);
    };
  }, []);

  // Local countdown — derive from server value minus elapsed seconds since last fetch
  const liveCooldown = (() => {
    if (!status) return 0;
    const elapsed = Math.floor((Date.now() - new Date(status.asOf).getTime()) / 1000);
    return Math.max(0, status.cooldownRemaining - elapsed);
  })();
  // ensure linter knows cooldownTick is read (forces recompute)
  void cooldownTick;

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

  const [manualDir, setManualDir] = useState<"LONG" | "SHORT">("LONG");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  async function triggerNow() {
    if (!config) return;
    if (
      !confirm(
        `Place a test ${manualDir} order NOW?\n\n` +
        `Size: ${config.size} contracts. Bypasses signal + cooldown but still respects policy (MAX_TRADE_SIZE etc).\n\n` +
        `Use only for testing — it's a real broker order on Capital Demo.`
      )
    ) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch("/api/autotrader/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: manualDir }),
      });
      const j = (await res.json().catch(() => ({}))) as { action?: string; detail?: string; error?: string };
      if (!res.ok && j.action !== "QUEUED") {
        throw new Error(j.error || j.detail || `HTTP ${res.status}`);
      }
      setTriggerMsg(`${j.action ?? "OK"} · ${j.detail ?? ""}`);
      await load(false);
    } catch (e) {
      setTriggerMsg(`error: ${(e as Error).message}`);
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMsg(null), 6000);
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Direction toggle for the manual trigger */}
          <div className="flex border border-line rounded overflow-hidden">
            {(["LONG", "SHORT"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setManualDir(d)}
                className={`mono text-[10px] uppercase tracking-widest py-2 px-2 transition-colors ${
                  manualDir === d
                    ? d === "LONG"
                      ? "bg-accent-green/15 text-accent-green"
                      : "bg-accent-red/15 text-accent-red"
                    : "bg-bg-raised text-ink-muted hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={triggerNow}
            disabled={triggering}
            title="Place a test trade NOW (bypasses signal + cooldown, still respects policy)"
            className="mono text-xs uppercase tracking-widest py-2 px-3 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/40 hover:bg-accent-amber/25 disabled:opacity-50"
          >
            {triggering ? "placing…" : "↯ Trade now"}
          </button>
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
      {triggerMsg && (
        <div className={`mono text-[11px] px-2 ${triggerMsg.startsWith("error") ? "text-accent-red" : "text-accent-amber"}`}>
          {triggerMsg}
        </div>
      )}

      {/* ── Bot Brain — live decision visibility ─────────────────────────── */}
      <Brain
        status={status}
        liveCooldown={liveCooldown}
        policies={policies}
        account={account}
        configuredSize={config.size}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Strategy">
          <select
            className="input"
            value={config.strategy}
            onChange={(e) => patch({ strategy: e.target.value as Strategy })}
            disabled={saving}
          >
            {STRATEGY_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <span className="mono text-[9px] text-ink-dim mt-0.5">
            {STRATEGY_OPTIONS.find((s) => s.id === config.strategy)?.desc}
          </span>
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

// ── Brain sub-component ────────────────────────────────────────────────────

const SIGNAL_TONE: Record<Signal, string> = {
  BUY: "text-accent-green",
  SELL: "text-accent-red",
  NEUTRAL: "text-accent-amber",
};
const SIGNAL_BG: Record<Signal, string> = {
  BUY: "bg-accent-green/15 ring-accent-green/40",
  SELL: "bg-accent-red/15 ring-accent-red/40",
  NEUTRAL: "bg-accent-amber/15 ring-accent-amber/40",
};
const ACTION_TONE: Record<string, string> = {
  OPEN: "text-accent-green",
  FLIP: "text-accent-amber",
  HOLD: "text-ink-muted",
  QUEUED: "text-accent-purple",
  ERROR: "text-accent-red",
  NONE: "text-ink-dim",
};

function Brain({
  status,
  liveCooldown,
  policies,
  account,
  configuredSize,
}: {
  status: Status | null;
  liveCooldown: number;
  policies: Policy[];
  account: AccountInfo | null;
  configuredSize: number;
}) {
  if (!status) {
    return (
      <div className="bg-bg-raised/60 rounded p-3 mono text-[11px] text-ink-dim">
        Brain · loading status…
      </div>
    );
  }

  const tradeRelated = policies.filter(
    (p) => p.enabled && ["MAX_TRADE_SIZE", "DAILY_LOSS"].includes(p.ruleType)
  );

  return (
    <div className="bg-bg-raised/40 border border-line rounded p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="display text-sm font-semibold text-accent-purple">🧠 Brain</span>
          <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">
            live · refreshed every 2s · {status.candleCount} candles
          </span>
        </div>
        {account?.name && (
          <span className="mono text-[10px] text-ink-dim">
            account: <span className="text-ink">{account.name}</span>
            {account.accountId && <span> · {account.accountId}</span>}
            {account.currency && <span> · {account.currency}</span>}
          </span>
        )}
      </div>

      {/* Indicator cards */}
      {status.signals ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <IndicatorCard
            label={`RSI(${status.signals.rsi.period})`}
            value={status.signals.rsi.value?.toFixed(2) ?? "—"}
            signal={status.signals.rsi.signal}
            hint="<30 SELL · >70 BUY (momentum)"
          />
          <IndicatorCard
            label="MACD(12,26,9)"
            value={status.signals.macd.macd?.toFixed(3) ?? "—"}
            signal={status.signals.macd.trend}
            hint={`signal ${status.signals.macd.signal?.toFixed(3) ?? "—"} · hist ${status.signals.macd.histogram?.toFixed(3) ?? "—"}`}
          />
          <IndicatorCard
            label="EMA 50/200"
            value={`${status.signals.ema.ema50?.toFixed(2) ?? "—"} / ${status.signals.ema.ema200?.toFixed(2) ?? "—"}`}
            signal={status.signals.ema.signal}
            hint="fast > slow = BUY"
          />
        </div>
      ) : (
        <div className="mono text-[11px] text-ink-dim text-center py-2">
          not enough candles yet ({status.candleCount}/50) — try reseed
        </div>
      )}

      {/* Vote tally + verdict */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] mono">
        <div className="text-ink-muted">
          <span className="text-ink-dim">strategy:</span> <span className="text-ink">{status.config.strategy}</span>
          <span className="mx-2 text-ink-dim">·</span>
          <span className="text-ink-dim">votes:</span>{" "}
          <span className="text-accent-green">{status.votes.buy} BUY</span>
          <span className="mx-1 text-ink-dim">·</span>
          <span className="text-accent-red">{status.votes.sell} SELL</span>
          <span className="mx-1 text-ink-dim">·</span>
          <span className="text-accent-amber">{status.votes.neutral} NEUTRAL</span>
        </div>
        <span className={`mono text-[11px] uppercase tracking-widest px-2 py-1 rounded ring-1 font-bold ${SIGNAL_BG[status.verdict]} ${SIGNAL_TONE[status.verdict]}`}>
          verdict: {status.verdict}
        </span>
      </div>
      <div className="mono text-[10px] text-ink-dim">{status.verdictReason}</div>

      {/* Cooldown */}
      {liveCooldown > 0 && (
        <div className="mono text-[11px] text-accent-amber">
          ⏱ cooldown · {liveCooldown}s until next scheduled tick can fire
        </div>
      )}

      {/* Next action */}
      <div className="bg-bg-base/60 rounded p-2 flex flex-col gap-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          if tick() ran now
        </div>
        <div className="flex items-center gap-2">
          <span className={`mono text-xs font-bold ${ACTION_TONE[status.nextAction.action] ?? "text-ink"}`}>
            {status.nextAction.action}
          </span>
          <span className="mono text-[11px] text-ink-muted">{status.nextAction.detail}</span>
        </div>
      </div>

      {/* Active policies */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">policies:</span>
        {tradeRelated.length === 0 && (
          <span className="mono text-[10px] text-ink-dim">none active</span>
        )}
        {tradeRelated.map((p) => {
          const blocked =
            (p.ruleType === "MAX_TRADE_SIZE" && configuredSize > p.threshold) ||
            false;
          return (
            <span
              key={p.id}
              className={`mono text-[10px] ${blocked ? "text-accent-red" : "text-ink-muted"}`}
              title={p.name}
            >
              {p.ruleType}: {p.threshold}{blocked && " ⚠ blocks size"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function IndicatorCard({
  label,
  value,
  signal,
  hint,
}: {
  label: string;
  value: string;
  signal: Signal;
  hint: string;
}) {
  return (
    <div className="bg-bg-base/50 border border-line rounded p-2 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</span>
        <span className={`mono text-[10px] font-bold ${SIGNAL_TONE[signal]}`}>{signal}</span>
      </div>
      <div className="mono text-lg font-bold text-ink">{value}</div>
      <div className="mono text-[9px] text-ink-dim">{hint}</div>
    </div>
  );
}
