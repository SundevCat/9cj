"use client";

import { useState } from "react";

type Strategy = "RSI" | "MACD" | "EMA_CROSS";

type Trade = {
  entryTs: number;
  entryPrice: number;
  exitTs: number;
  exitPrice: number;
  direction: "LONG" | "SHORT";
  pnl: number;
  pnlPct: number;
};

type Result = {
  strategy: Strategy;
  candleCount: number;
  trades: Trade[];
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPct: number;
  sharpe: number;
  maxDrawdown: number;
  equityCurve: { ts: number; equity: number }[];
};

const STRATEGIES: { id: Strategy; label: string; description: string }[] = [
  { id: "RSI", label: "RSI(14) cross", description: "Buy when RSI crosses up through 30, sell when it crosses down through 70." },
  { id: "MACD", label: "MACD(12,26,9)", description: "Buy on MACD signal-line crossover up, sell on crossover down." },
  { id: "EMA_CROSS", label: "EMA 50/200", description: "Buy on golden cross (EMA50 > EMA200), sell on death cross." },
];

export function BacktestLab() {
  const [strategy, setStrategy] = useState<Strategy>("RSI");
  const [source, setSource] = useState<"stored" | "csv">("stored");
  const [csvText, setCsvText] = useState("");
  const [startingEquity, setStartingEquity] = useState("10000");
  const [limit, setLimit] = useState("500");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          source,
          csv: source === "csv" ? csvText : undefined,
          startingEquity: Number(startingEquity) || 10_000,
          limit: Number(limit) || 500,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json as Result);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCsvText(String(r.result || ""));
    r.readAsText(f);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* Controls */}
      <div className="panel p-4 flex flex-col gap-4 h-fit">
        <div className="display text-sm font-semibold">Strategy</div>
        <div className="flex flex-col gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStrategy(s.id)}
              className={[
                "text-left p-3 rounded-md border transition-colors",
                strategy === s.id
                  ? "border-accent-purple/50 bg-accent-purple/10"
                  : "border-line bg-bg-raised hover:border-accent-purple/30",
              ].join(" ")}
            >
              <div className="mono text-xs font-bold text-ink">{s.label}</div>
              <div className="text-[11px] text-ink-muted mt-1">{s.description}</div>
            </button>
          ))}
        </div>

        <div className="display text-sm font-semibold mt-2">Data Source</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSource("stored")}
            className={`mono text-[11px] uppercase tracking-widest py-2 rounded border ${
              source === "stored"
                ? "bg-accent-blue/15 text-accent-blue border-accent-blue/40"
                : "bg-bg-raised text-ink-muted border-line hover:text-ink"
            }`}
          >
            Stored
          </button>
          <button
            type="button"
            onClick={() => setSource("csv")}
            className={`mono text-[11px] uppercase tracking-widest py-2 rounded border ${
              source === "csv"
                ? "bg-accent-blue/15 text-accent-blue border-accent-blue/40"
                : "bg-bg-raised text-ink-muted border-line hover:text-ink"
            }`}
          >
            CSV
          </button>
        </div>

        {source === "csv" ? (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onCsvFile}
              className="mono text-[11px] text-ink-muted file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-line file:bg-bg-raised file:text-ink file:mono file:text-[10px] file:uppercase file:tracking-widest"
            />
            <div className="mono text-[10px] text-ink-dim">
              cols: timestamp,open,high,low,close[,volume]
            </div>
            {csvText && (
              <div className="mono text-[10px] text-accent-green">
                ✓ {csvText.split(/\r?\n/).length - 1} rows loaded
              </div>
            )}
          </div>
        ) : (
          <Field label="Candles">
            <input
              className="input"
              type="number"
              min={30}
              max={5000}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
        )}

        <Field label="Starting Equity">
          <input
            className="input"
            type="number"
            value={startingEquity}
            onChange={(e) => setStartingEquity(e.target.value)}
          />
        </Field>

        {err && <div className="mono text-[11px] text-accent-red">{err}</div>}

        <button
          onClick={run}
          disabled={running || (source === "csv" && !csvText)}
          className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 transition-colors disabled:opacity-50"
        >
          {running ? "running…" : "run backtest"}
        </button>

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
            border-color: #B794F4;
          }
        `}</style>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        {!result && !running && (
          <div className="panel p-8 text-center">
            <div className="display text-lg text-ink-muted">Pick a strategy and click <span className="text-accent-purple">Run Backtest</span></div>
            <div className="mono text-[11px] text-ink-dim mt-2">Stored source uses the same 1-min XAU candles as the desk.</div>
          </div>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Trades" value={String(result.totalTrades)} />
              <Stat
                label="Win Rate"
                value={`${(result.winRate * 100).toFixed(1)}%`}
                tone={result.winRate >= 0.5 ? "green" : "amber"}
              />
              <Stat
                label="Total P&L"
                value={`${result.totalPnL >= 0 ? "+" : ""}${result.totalPnL.toFixed(2)}`}
                tone={result.totalPnL >= 0 ? "green" : "red"}
                hint={`${(result.totalPnLPct * 100).toFixed(2)}%`}
              />
              <Stat
                label="Sharpe"
                value={result.sharpe.toFixed(2)}
                tone={result.sharpe >= 1 ? "green" : result.sharpe > 0 ? "amber" : "red"}
                hint={`max DD ${(result.maxDrawdown * 100).toFixed(1)}%`}
              />
            </div>

            <EquityCurve points={result.equityCurve} />

            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <div className="display text-sm font-semibold">Trades</div>
                <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">
                  {result.trades.length} closed · {result.candleCount} candles
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-normal">Entry</th>
                      <th className="text-left px-3 py-2 font-normal">Exit</th>
                      <th className="text-left px-3 py-2 font-normal">Dir</th>
                      <th className="text-right px-3 py-2 font-normal">In</th>
                      <th className="text-right px-3 py-2 font-normal">Out</th>
                      <th className="text-right px-3 py-2 font-normal">P&L</th>
                      <th className="text-right px-3 py-2 font-normal">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => {
                      const tone = t.pnl >= 0 ? "text-accent-green" : "text-accent-red";
                      const dirTone = t.direction === "LONG" ? "text-accent-green" : "text-accent-red";
                      return (
                        <tr key={i} className="border-b border-line/60 last:border-b-0">
                          <td className="px-3 py-1.5 mono text-[11px] text-ink-muted">
                            {new Date(t.entryTs).toLocaleString("en-GB")}
                          </td>
                          <td className="px-3 py-1.5 mono text-[11px] text-ink-muted">
                            {new Date(t.exitTs).toLocaleString("en-GB")}
                          </td>
                          <td className={`px-3 py-1.5 mono text-[11px] font-bold ${dirTone}`}>
                            {t.direction}
                          </td>
                          <td className="px-3 py-1.5 mono text-right">{t.entryPrice.toFixed(2)}</td>
                          <td className="px-3 py-1.5 mono text-right">{t.exitPrice.toFixed(2)}</td>
                          <td className={`px-3 py-1.5 mono text-right ${tone}`}>
                            {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                          </td>
                          <td className={`px-3 py-1.5 mono text-right ${tone}`}>
                            {(t.pnlPct * 100).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                    {result.trades.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-ink-dim mono text-xs">
                          No signals fired on this dataset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
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

function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "amber" | "neutral";
  hint?: string;
}) {
  const map = {
    green: "text-accent-green",
    red: "text-accent-red",
    amber: "text-accent-amber",
    neutral: "text-ink",
  };
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</div>
      <div className={`mono text-2xl font-bold ${map[tone]}`}>{value}</div>
      {hint && <div className="mono text-[10px] text-ink-dim">{hint}</div>}
    </div>
  );
}

function EquityCurve({ points }: { points: { ts: number; equity: number }[] }) {
  if (points.length === 0) return null;
  const w = 800;
  const h = 160;
  const pad = 12;
  const min = Math.min(...points.map((p) => p.equity));
  const max = Math.max(...points.map((p) => p.equity));
  const range = max - min || 1;
  const xStep = (w - pad * 2) / Math.max(points.length - 1, 1);

  const d = points
    .map((p, i) => {
      const x = pad + i * xStep;
      const y = h - pad - ((p.equity - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1].equity;
  const first = points[0].equity;
  const trend = last >= first ? "stroke-accent-green" : "stroke-accent-red";

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          Equity Curve
        </div>
        <div className="mono text-[10px] text-ink-dim">
          {min.toFixed(0)} → {max.toFixed(0)}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
        <path d={d} className={`fill-none ${trend}`} strokeWidth={1.5} />
      </svg>
    </div>
  );
}
