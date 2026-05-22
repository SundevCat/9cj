"use client";

import { useEffect, useState } from "react";

type Device = {
  entityId: string;
  name: string;
  domain: "light" | "switch" | "climate" | "sensor" | "binary_sensor";
  state: string;
  unit?: string;
};
type Fleet = {
  devices: Device[];
  source: "home-assistant" | "mock";
  energyKwhToday: number;
  energyKwhAvg7d: number;
};

const MODES = ["WORK", "HOME", "AWAY", "SLEEP"] as const;
type Mode = typeof MODES[number];

const MODE_TONE: Record<Mode, string> = {
  WORK: "bg-accent-blue/15 text-accent-blue border-accent-blue/40",
  HOME: "bg-accent-green/15 text-accent-green border-accent-green/40",
  AWAY: "bg-accent-amber/15 text-accent-amber border-accent-amber/40",
  SLEEP: "bg-accent-purple/15 text-accent-purple border-accent-purple/40",
};

export function HomeOpsPage() {
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [mode, setMode] = useState<Mode>("HOME");
  const [toggling, setToggling] = useState<string | null>(null);

  async function loadAll() {
    const [f, m] = await Promise.all([
      fetch("/api/home/devices", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/home/mode", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setFleet(f as Fleet);
    setMode(m.mode as Mode);
  }
  useEffect(() => { loadAll(); }, []);

  async function toggle(entityId: string) {
    setToggling(entityId);
    try {
      await fetch(`/api/home/device/${encodeURIComponent(entityId)}/toggle`, { method: "POST" });
      await loadAll();
    } finally {
      setToggling(null);
    }
  }

  async function setHomeMode(next: Mode) {
    setMode(next);
    await fetch("/api/home/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
  }

  const groups = (fleet?.devices ?? []).reduce<Record<string, Device[]>>((acc, d) => {
    (acc[d.domain] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Mode + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <div className="panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="display text-sm font-semibold">Home Mode</div>
            <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">
              source: {fleet?.source ?? "—"}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setHomeMode(m)}
                className={[
                  "mono text-xs uppercase tracking-widest py-3 rounded border transition-colors",
                  mode === m
                    ? MODE_TONE[m]
                    : "bg-bg-raised border-line text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="mono text-[11px] text-ink-dim">
            Active profile: <span className="text-ink">{mode}</span>
          </div>
        </div>

        <div className="panel p-4 flex flex-col gap-2">
          <div className="display text-sm font-semibold">Energy</div>
          <div className="mono text-3xl font-bold text-accent-amber">
            {fleet ? fleet.energyKwhToday.toFixed(1) : "—"}
            <span className="text-base text-ink-dim"> kWh</span>
          </div>
          <div className="mono text-[11px] text-ink-dim">
            today · 7d avg {fleet ? fleet.energyKwhAvg7d.toFixed(1) : "—"} kWh
          </div>
          <div className="h-1.5 rounded bg-bg-raised overflow-hidden">
            <div
              className="h-full bg-accent-amber"
              style={{ width: `${Math.min(100, ((fleet?.energyKwhToday ?? 0) / Math.max(1, fleet?.energyKwhAvg7d ?? 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Device grid */}
      <div className="flex flex-col gap-4">
        {(["light", "switch", "climate", "sensor", "binary_sensor"] as const).map((group) => {
          const items = groups[group];
          if (!items?.length) return null;
          return (
            <div key={group} className="flex flex-col gap-2">
              <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">{group}s</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map((d) => {
                  const isToggle = d.domain === "light" || d.domain === "switch";
                  const on = d.state === "on";
                  return (
                    <button
                      key={d.entityId}
                      onClick={() => isToggle && toggle(d.entityId)}
                      disabled={!isToggle || toggling === d.entityId}
                      className={[
                        "panel p-3 flex flex-col gap-2 text-left transition-colors",
                        isToggle
                          ? on
                            ? "border-accent-green/40 bg-accent-green/5 hover:bg-accent-green/10"
                            : "hover:border-accent-blue/30"
                          : "cursor-default",
                        toggling === d.entityId && "opacity-60",
                      ].filter(Boolean).join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="mono text-xs text-ink">{d.name}</div>
                        {isToggle && (
                          <span
                            className={`h-2 w-2 rounded-full ${on ? "bg-accent-green" : "bg-ink-dim"}`}
                          />
                        )}
                      </div>
                      <div className="mono text-[10px] text-ink-dim">{d.entityId}</div>
                      <div className="mono text-lg font-bold text-ink">
                        {d.state}
                        {d.unit && <span className="text-xs text-ink-dim ml-1">{d.unit}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
