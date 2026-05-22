"use client";

import { useEffect, useState } from "react";

const DEMO_BUTTONS = [
  { label: "Reseed Prices",      endpoint: "/api/reseed",           tone: "amber"  },
  { label: "Load Finance Demo",  endpoint: "/api/finance/seed-demo", tone: "green"  },
  { label: "Load DevOps Demo",   endpoint: "/api/devops/seed-demo",  tone: "blue"   },
  { label: "Load Phase 4 Demo",  endpoint: "/api/phase4/seed-demo",  tone: "purple" },
] as const;

const TONE_CLS: Record<string, string> = {
  amber:  "bg-accent-amber/15 text-accent-amber border-accent-amber/40 hover:bg-accent-amber/25",
  green:  "bg-accent-green/15 text-accent-green border-accent-green/40 hover:bg-accent-green/25",
  blue:   "bg-accent-blue/15 text-accent-blue border-accent-blue/40 hover:bg-accent-blue/25",
  purple: "bg-accent-purple/15 text-accent-purple border-accent-purple/40 hover:bg-accent-purple/25",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [hassUrl, setHassUrl] = useState("");
  const [hassToken, setHassToken] = useState("");
  const [claudeKey, setClaudeKey] = useState("");

  async function load() {
    const j = await fetch("/api/settings", { cache: "no-store" }).then((r) => r.json());
    setSettings(j.settings ?? {});
    const initialTheme = (j.settings?.["ui.theme"] as "dark" | "light") || (typeof window !== "undefined" ? (localStorage.getItem("ui.theme") as "dark" | "light") : "dark") || "dark";
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setHassUrl(j.settings?.["hass.url"] ?? "");
    setHassToken(j.settings?.["hass.token"] ?? "");
    setClaudeKey(j.settings?.["claude.api_key"] ?? "");
  }
  useEffect(() => { load(); }, []);

  function applyTheme(t: "dark" | "light") {
    if (typeof document === "undefined") return;
    if (t === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("ui.theme", t);
  }

  async function saveTheme(t: "dark" | "light") {
    setTheme(t);
    applyTheme(t);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "ui.theme": t }),
    });
  }

  async function saveKeys(e: React.FormEvent) {
    e.preventDefault();
    setBusy("keys");
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "hass.url": hassUrl,
          "hass.token": hassToken,
          "claude.api_key": claudeKey,
        }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function runDemo(ep: string) {
    setBusy(ep);
    try {
      await fetch(ep, { method: "POST" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Theme */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Appearance</div>
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => saveTheme(t)}
                className={`mono text-xs uppercase tracking-widest py-3 rounded border transition-colors ${
                  theme === t
                    ? "bg-accent-blue/15 text-accent-blue border-accent-blue/40"
                    : "bg-bg-raised border-line text-ink-muted hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mono text-[10px] text-ink-dim">
            Dark is the primary mode. Light is experimental — most panels are tuned for dark.
          </div>
        </div>

        {/* Demo loaders */}
        <div className="panel p-4 flex flex-col gap-3">
          <div className="display text-sm font-semibold">Demo Data</div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_BUTTONS.map((b) => (
              <button
                key={b.endpoint}
                onClick={() => runDemo(b.endpoint)}
                disabled={busy === b.endpoint}
                className={`mono text-[11px] uppercase tracking-widest py-2 rounded border transition-colors disabled:opacity-50 ${TONE_CLS[b.tone]}`}
              >
                {busy === b.endpoint ? "loading…" : b.label}
              </button>
            ))}
          </div>
          <div className="mono text-[10px] text-ink-dim">
            Each loader resets that module's tables and seeds a believable spread.
          </div>
        </div>
      </div>

      {/* Integrations */}
      <form onSubmit={saveKeys} className="panel p-4 flex flex-col gap-3">
        <div className="display text-sm font-semibold">Integrations</div>
        <p className="mono text-[11px] text-ink-dim">
          Stored in the local SQLite <code className="text-ink">Setting</code> table. The server reads these at request time;
          restart the dev server after changing for them to take effect.
        </p>
        <Field label="Home Assistant URL">
          <input value={hassUrl} onChange={(e) => setHassUrl(e.target.value)} className="input" placeholder="http://homeassistant.local:8123" />
        </Field>
        <Field label="Home Assistant Token">
          <input value={hassToken} onChange={(e) => setHassToken(e.target.value)} type="password" className="input" placeholder="long-lived access token" />
        </Field>
        <Field label="Claude API Key (optional)">
          <input value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} type="password" className="input" placeholder="sk-ant-…" />
        </Field>
        <button
          type="submit"
          disabled={busy === "keys"}
          className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-green/15 text-accent-green border border-accent-green/40 hover:bg-accent-green/25 disabled:opacity-50 self-start"
        >
          {busy === "keys" ? "saving…" : "save integrations"}
        </button>
      </form>

      <div className="panel p-4 flex flex-col gap-3">
        <div className="display text-sm font-semibold">Stored Settings</div>
        <pre className="mono text-[11px] text-ink-muted whitespace-pre-wrap bg-bg-raised rounded p-3 max-h-[200px] overflow-auto">
          {Object.keys(settings).length === 0 ? "{}" : JSON.stringify(settings, null, 2)}
        </pre>
      </div>

      <style jsx>{`
        .input {
          background: #0a0c10;
          border: 1px solid #1f242d;
          border-radius: 6px;
          padding: 7px 10px;
          font-family: var(--font-space-mono), monospace;
          font-size: 12px;
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
