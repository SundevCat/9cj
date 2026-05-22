"use client";

import { useEffect, useState } from "react";

type Trade = {
  id: number;
  createdAt: string;
  direction: "LONG" | "SHORT";
  entry: number;
  exit: number | null;
  size: number;
  pnl: number | null;
  status: "OPEN" | "CLOSED";
  notes: string | null;
};

export function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const res = await fetch("/api/trades", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { trades: Trade[] };
      setTrades(json.trades);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          entry,
          exit: exit || null,
          size,
          notes: notes || null,
          status: exit ? "CLOSED" : "OPEN",
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setEntry("");
      setExit("");
      setSize("");
      setNotes("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="display text-sm font-semibold">Trade Journal</div>
          <div className="mono text-[10px] text-ink-dim uppercase tracking-widest">
            {trades.length} entries
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-normal">Time</th>
                <th className="text-left px-3 py-2 font-normal">Dir</th>
                <th className="text-right px-3 py-2 font-normal">Entry</th>
                <th className="text-right px-3 py-2 font-normal">Exit</th>
                <th className="text-right px-3 py-2 font-normal">Size</th>
                <th className="text-right px-3 py-2 font-normal">P&L</th>
                <th className="text-left px-3 py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-dim mono text-xs">
                    No trades yet — log one with the form →
                  </td>
                </tr>
              )}
              {trades.map((t) => {
                const pnlTone =
                  t.pnl === null ? "text-ink-muted" :
                  t.pnl >= 0 ? "text-accent-green" : "text-accent-red";
                const dirTone = t.direction === "LONG" ? "text-accent-green" : "text-accent-red";
                return (
                  <tr key={t.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">
                      {new Date(t.createdAt).toLocaleTimeString("en-GB")}
                    </td>
                    <td className={`px-3 py-2 mono text-[11px] font-bold ${dirTone}`}>{t.direction}</td>
                    <td className="px-3 py-2 mono text-right">{t.entry.toFixed(2)}</td>
                    <td className="px-3 py-2 mono text-right">{t.exit?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 mono text-right">{t.size}</td>
                    <td className={`px-3 py-2 mono text-right ${pnlTone}`}>
                      {t.pnl === null ? "—" : `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2 mono text-[11px] text-ink-muted">{t.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={submit} className="panel p-4 flex flex-col gap-3">
        <div className="display text-sm font-semibold">Log Trade</div>

        <div className="flex gap-2">
          {(["LONG", "SHORT"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={[
                "flex-1 mono text-xs uppercase tracking-widest py-2 rounded border transition-colors",
                direction === d
                  ? d === "LONG"
                    ? "bg-accent-green/15 text-accent-green border-accent-green/40"
                    : "bg-accent-red/15 text-accent-red border-accent-red/40"
                  : "bg-bg-raised text-ink-muted border-line hover:text-ink",
              ].join(" ")}
            >
              {d}
            </button>
          ))}
        </div>

        <Field label="Entry">
          <input
            type="number" step="0.01" required value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Exit (blank = open)">
          <input
            type="number" step="0.01" value={exit}
            onChange={(e) => setExit(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Size">
          <input
            type="number" step="0.01" required value={size}
            onChange={(e) => setSize(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Notes">
          <input
            type="text" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            placeholder="optional"
          />
        </Field>

        {err && <div className="mono text-[11px] text-accent-red">{err}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="mono text-xs uppercase tracking-widest py-2 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/40 hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
        >
          {submitting ? "saving…" : "save trade"}
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
            border-color: #63B3ED;
          }
        `}</style>
      </form>
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
