"use client";

import { useEffect, useState } from "react";

type Signal = "BUY" | "SELL" | "NEUTRAL";

type Signals = {
  rsi: { value: number | null; signal: Signal; period: number };
  macd: { macd: number | null; signal: number | null; histogram: number | null; trend: Signal };
  ema: { ema50: number | null; ema200: number | null; signal: Signal };
  sampleSize: number;
  asOf: string;
};

const TONE: Record<Signal, { bg: string; text: string; ring: string }> = {
  BUY:     { bg: "bg-accent-green/15", text: "text-accent-green", ring: "ring-accent-green/40" },
  SELL:    { bg: "bg-accent-red/15",   text: "text-accent-red",   ring: "ring-accent-red/40"   },
  NEUTRAL: { bg: "bg-accent-amber/15", text: "text-accent-amber", ring: "ring-accent-amber/40" },
};

function Pill({ signal }: { signal: Signal }) {
  const c = TONE[signal];
  return (
    <span className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      {signal}
    </span>
  );
}

export function SignalDashboard({ refreshMs = 30_000 }: { refreshMs?: number }) {
  const [data, setData] = useState<Signals | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/signals", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Signals;
        if (!cancelled) {
          setData(json);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    }
    tick();
    const id = setInterval(tick, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
            RSI({data?.rsi.period ?? 14})
          </div>
          {data && <Pill signal={data.rsi.signal} />}
        </div>
        <div className="mono text-3xl font-bold text-ink">
          {data?.rsi.value ?? "—"}
        </div>
        <div className="mono text-[11px] text-ink-dim">
          &lt;30 oversold · &gt;70 overbought
        </div>
      </div>

      <div className="panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
            MACD(12,26,9)
          </div>
          {data && <Pill signal={data.macd.trend} />}
        </div>
        <div className="mono text-3xl font-bold text-ink">
          {data?.macd.macd?.toFixed(3) ?? "—"}
        </div>
        <div className="mono text-[11px] text-ink-dim">
          signal {data?.macd.signal?.toFixed(3) ?? "—"} · hist {data?.macd.histogram?.toFixed(3) ?? "—"}
        </div>
      </div>

      <div className="panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
            EMA 50 / 200
          </div>
          {data && <Pill signal={data.ema.signal} />}
        </div>
        <div className="mono text-3xl font-bold text-ink">
          {data?.ema.ema50?.toFixed(2) ?? "—"}
          <span className="text-ink-dim text-base"> / {data?.ema.ema200?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="mono text-[11px] text-ink-dim">
          fast above slow = bull · {err && <span className="text-accent-red">{err}</span>}
        </div>
      </div>
    </div>
  );
}
