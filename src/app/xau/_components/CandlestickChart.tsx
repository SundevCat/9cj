"use client";

import { useEffect, useRef } from "react";

type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export function CandlestickChart({ height = 360 }: { height?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

      // lightweight-charts v5 API: addSeries(CandlestickSeries, options)
      const candleSeries = created.addSeries(lib.CandlestickSeries, {
        upColor: "#68D391",
        downColor: "#FC8181",
        borderUpColor: "#68D391",
        borderDownColor: "#FC8181",
        wickUpColor: "#68D391",
        wickDownColor: "#FC8181",
      });

      const res = await fetch("/api/price/history?limit=200", { cache: "no-store" });
      const json = (await res.json()) as { candles: Candle[] };
      if (disposed) return;

      const series = json.candles.map((c) => ({
        // lightweight-charts time as unix seconds
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(series);
      created.timeScale().fitContent();

      // Responsive resize
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
  }, [height]);

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          XAU/USD · 1-min candles · last 200
        </div>
        <div className="mono text-[10px] text-ink-dim">lightweight-charts</div>
      </div>
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}
