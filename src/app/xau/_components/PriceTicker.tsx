"use client";

import { useEffect, useState } from "react";

type Spot = {
  price: number;
  source: string;
  fetchedAt: string;
  delta: number;
  deltaPct: number;
};

export function PriceTicker({ refreshMs = 30_000 }: { refreshMs?: number }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    let cancelled = false;
    let prevPrice: number | null = null;

    async function tick() {
      try {
        const res = await fetch("/api/price", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Spot;
        if (cancelled) return;
        if (prevPrice !== null) {
          setFlash(data.price > prevPrice ? "up" : data.price < prevPrice ? "down" : null);
          setTimeout(() => !cancelled && setFlash(null), 600);
        }
        prevPrice = data.price;
        setSpot(data);
        setErr(null);
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

  const priceTone =
    flash === "up" ? "text-accent-green" :
    flash === "down" ? "text-accent-red" :
    "text-accent-amber";
  const deltaTone = (spot?.delta ?? 0) >= 0 ? "text-accent-green" : "text-accent-red";

  return (
    <div className="panel p-5 flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          XAU / USD · spot
        </div>
        <div className={`mono text-4xl font-bold transition-colors ${priceTone}`}>
          {spot ? spot.price.toFixed(2) : "—"}
        </div>
        <div className="mono text-[11px] text-ink-muted">
          source: {spot?.source ?? "—"} · {spot ? new Date(spot.fetchedAt).toLocaleTimeString("en-GB") : "—"}
          {err && <span className="ml-2 text-accent-red">· {err}</span>}
        </div>
      </div>
      <div className="text-right flex flex-col gap-1">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          Δ vs last candle
        </div>
        <div className={`mono text-2xl font-bold ${deltaTone}`}>
          {spot ? `${spot.delta >= 0 ? "+" : ""}${spot.delta.toFixed(2)}` : "—"}
        </div>
        <div className={`mono text-[11px] ${deltaTone}`}>
          {spot ? `${spot.deltaPct >= 0 ? "+" : ""}${spot.deltaPct.toFixed(3)}%` : "—"}
        </div>
      </div>
    </div>
  );
}
