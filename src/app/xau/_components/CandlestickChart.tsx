"use client";

import { useEffect, useRef, useState } from "react";
import type { UTCTimestamp } from "lightweight-charts";

type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type Resolution = "MINUTE" | "MINUTE_5" | "MINUTE_15" | "MINUTE_30" | "HOUR" | "HOUR_4" | "DAY" | "WEEK";

const TIMEFRAMES: { id: Resolution; label: string }[] = [
  { id: "MINUTE",    label: "1m"  },
  { id: "MINUTE_5",  label: "5m"  },
  { id: "MINUTE_15", label: "15m" },
  { id: "MINUTE_30", label: "30m" },
  { id: "HOUR",      label: "1h"  },
  { id: "HOUR_4",    label: "4h"  },
  { id: "DAY",       label: "1D"  },
  { id: "WEEK",      label: "1W"  },
];

export function CandlestickChart({ height = 360 }: { height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [resolution, setResolution] = useState<Resolution>("MINUTE");
  const [source, setSource] = useState<string>("");
  const [count, setCount] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reseeding, setReseeding] = useState(false);

  useEffect(() => {
    let disposed = false;
    let chart: { remove: () => void; resize: (w: number, h: number) => void } | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      const lib = await import("lightweight-charts");
      const el = containerRef.current;
      if (!el || disposed) return;

      const created = lib.createChart(el, {
        height,
        layout: {
          background: { color: "#111318" },
          textColor: "#8b93a3",
          fontFamily: "var(--font-space-mono), monospace",
        },
        grid: {
          vertLines: { color: "#1f242d" },
          horzLines: { color: "#1f242d" },
        },
        rightPriceScale: { borderColor: "#1f242d" },
        timeScale: { borderColor: "#1f242d", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 0 },
      });
      chart = created as unknown as typeof chart;

      const candleSeries = created.addSeries(lib.CandlestickSeries, {
        upColor: "#68D391",
        downColor: "#FC8181",
        borderUpColor: "#68D391",
        borderDownColor: "#FC8181",
        wickUpColor: "#68D391",
        wickDownColor: "#FC8181",
      });

      try {
        const res = await fetch(`/api/price/history?limit=300&resolution=${resolution}`, { cache: "no-store" });
        const json = (await res.json()) as { candles?: Candle[]; count?: number; source?: string; error?: string };
        if (disposed) return;
        if (!res.ok || !json.candles) {
          setErr(json.error ?? `HTTP ${res.status}`);
          setCount(0);
          return;
        }
        setErr(null);
        setSource(json.source ?? "");
        setCount(json.count ?? json.candles.length);

        const series = json.candles.map((c) => ({
          time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(series);
        created.timeScale().fitContent();
      } catch (e) {
        setErr((e as Error).message);
        setCount(0);
      }

      ro = new ResizeObserver(() => {
        if (!chart || !el) return;
        chart.resize(el.clientWidth, height);
      });
      ro.observe(el);
    })();

    return () => {
      disposed = true;
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
      if (chart) chart.remove();
    };
  }, [height, resolution, reloadKey]);

  async function reseed() {
    if (reseeding) return;
    setReseeding(true);
    try {
      const res = await fetch("/api/reseed", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setErr(null);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setErr(`reseed failed: ${(e as Error).message}`);
    } finally {
      setReseeding(false);
    }
  }

  const sourceLabel = source === "capital" ? "Capital.com real OHLCV" : source === "local" ? "local cache + SSE ticks" : source;
  const showOverlay = !reseeding && (err !== null || count === 0);

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
            XAU/USD · {TIMEFRAMES.find((t) => t.id === resolution)?.label} · {count} candles
          </div>
          {sourceLabel && (
            <div className="mono text-[10px] text-ink-dim">
              · source: <span className={source === "capital" ? "text-accent-green" : "text-accent-amber"}>{sourceLabel}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={reseed}
            disabled={reseeding}
            title="Wipe and re-seed the local Price table from Capital.com"
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-line bg-bg-raised text-ink-muted hover:text-accent-purple hover:border-accent-purple/40 transition-colors disabled:opacity-50"
          >
            {reseeding ? "reseeding…" : "↻ reseed"}
          </button>
          <span className="w-1" aria-hidden />
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setResolution(tf.id)}
              disabled={reseeding}
              className={`mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
                resolution === tf.id
                  ? "bg-accent-blue/15 text-accent-blue border-accent-blue/40"
                  : "bg-bg-raised text-ink-muted border-line hover:text-ink"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      {err && (
        <div className="mono text-[11px] text-accent-red mb-2 px-1">
          {err}
        </div>
      )}
      <div className="relative">
        <div ref={containerRef} style={{ width: "100%", height }} />
        {showOverlay && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-base/80 backdrop-blur-sm rounded"
            style={{ minHeight: height }}
          >
            <div className="mono text-[11px] text-ink-muted text-center max-w-sm px-4">
              {err
                ? `Chart failed to load · ${err}`
                : "Chart is empty — the Price table needs a reseed."}
            </div>
            <button
              onClick={reseed}
              disabled={reseeding}
              className="mono text-xs uppercase tracking-widest py-2 px-4 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/25 transition-colors disabled:opacity-50"
            >
              {reseeding ? "reseeding…" : "↻ Reseed candles"}
            </button>
            <div className="mono text-[10px] text-ink-dim text-center max-w-sm px-4">
              Calls <code className="text-ink">POST /api/reseed</code> — wipes the local Price table and pulls fresh OHLCV from Capital
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
