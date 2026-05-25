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
  isLive: boolean;
  brokerDealId: string | null;
  fillPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
};

type BrokerAccount = {
  name?: string;
  accountId?: string;
  currency?: string;
  balance: number;
  unrealizedPL: number;
  realizedPL: number;
  marginUsed: number;
  openTradeCount: number;
  nav?: number;
};

export function TradeJournal() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [size, setSize] = useState("0.1");
  const [notes, setNotes] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [isLive, setIsLive] = useState(false);

  // Broker account (Capital.com)
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [accountErr, setAccountErr] = useState<string | null>(null);

  // Market info (margin factor) — fetched once, cached in broker layer
  const [marginFactor, setMarginFactor] = useState<number | null>(null);
  const [marginIsEst, setMarginIsEst] = useState(false);

  async function loadMarketInfo() {
    try {
      const res = await fetch("/api/broker/market-info?instrument=XAU_USD", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { marginFactor?: number };
        if (typeof j.marginFactor === "number" && j.marginFactor > 0) {
          setMarginFactor(j.marginFactor);
          setMarginIsEst(false);
          return;
        }
      }
      // Fallback to typical 5% estimate
      setMarginFactor(5);
      setMarginIsEst(true);
    } catch {
      setMarginFactor(5);
      setMarginIsEst(true);
    }
  }

  async function loadTrades() {
    const res = await fetch("/api/trades", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { trades: Trade[] };
      setTrades(json.trades);
    }
  }

  async function loadAccount() {
    try {
      const res = await fetch("/api/broker/account", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { live?: BrokerAccount };
        setAccount(json.live ?? null);
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setAccountErr(j.error ?? "Failed to load broker account");
      }
    } catch {
      setAccountErr("Broker API not configured");
    }
  }

  useEffect(() => {
    loadTrades();
    loadAccount();
    loadMarketInfo();
  }, []);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        direction,
        size,
        notes: notes || null,
        isLive,
      };

      if (isLive) {
        if (stopLoss) body.stopLoss = parseFloat(stopLoss);
        if (takeProfit) body.takeProfit = parseFloat(takeProfit);
      } else {
        body.entry = entry;
        body.exit = exit || null;
        body.status = exit ? "CLOSED" : "OPEN";
      }

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(j.error || j.message || `HTTP ${res.status}`);
      }

      const result = (await res.json()) as {
        queued?: boolean;
        order?: { fillPrice?: number };
      };

      if (result.queued) {
        flash("⚠ Trade queued for approval — policy limit hit");
      } else if (result.order?.fillPrice) {
        flash(`✓ Live order filled @ ${result.order.fillPrice.toFixed(2)}`);
      } else {
        flash("✓ Trade saved");
      }

      setEntry(""); setExit(""); setNotes(""); setStopLoss(""); setTakeProfit("");
      await loadTrades();
      if (isLive) await loadAccount();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function closeLiveTrade(tradeId: number) {
    setClosing(tradeId);
    setErr(null);
    try {
      const res = await fetch("/api/broker/trades/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const result = (await res.json()) as { closePrice: number; pnl: number };
      flash(`✓ Closed @ ${result.closePrice.toFixed(2)} · PnL ${result.pnl >= 0 ? "+" : ""}${result.pnl.toFixed(2)}`);
      await loadTrades();
      await loadAccount();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setClosing(null);
    }
  }

  const liveTrades = trades.filter((t) => t.isLive && t.status === "OPEN");

  return (
    <div className="flex flex-col gap-3">

      {/* Broker Account Panel */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="display text-sm font-semibold text-accent-purple flex items-center gap-2 flex-wrap">
            <span>Capital.com</span>
            {account?.name && (
              <span className="mono text-[11px] text-ink">· {account.name}</span>
            )}
            {account?.accountId && (
              <span className="mono text-[10px] text-ink-dim">· {account.accountId}</span>
            )}
          </div>
          <button
            onClick={loadAccount}
            className="mono text-[10px] uppercase tracking-widest text-ink-dim hover:text-ink px-2 py-1 rounded border border-line hover:border-accent-blue/40 transition-colors"
          >
            Refresh
          </button>
        </div>
        {accountErr ? (
          <div className="mono text-[11px] text-accent-red">{accountErr}</div>
        ) : account ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <AccountStat label="Balance" value={`$${account.balance.toLocaleString("en", { minimumFractionDigits: 2 })}`} />
            <AccountStat label="NAV" value={account.nav != null ? `$${account.nav.toLocaleString("en", { minimumFractionDigits: 2 })}` : "—"} />
            <AccountStat
              label="Unrealized P&L"
              value={`${account.unrealizedPL >= 0 ? "+" : ""}$${account.unrealizedPL.toFixed(2)}`}
              tone={account.unrealizedPL >= 0 ? "green" : "red"}
            />
            <AccountStat
              label="Realized P&L"
              value={`${account.realizedPL >= 0 ? "+" : ""}$${account.realizedPL.toFixed(2)}`}
              tone={account.realizedPL >= 0 ? "green" : "red"}
            />
          </div>
        ) : (
          <div className="mono text-[11px] text-ink-dim animate-pulse">Loading account…</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">

        {/* Trade Table */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="display text-sm font-semibold">Trade Journal</div>
            <div className="flex items-center gap-3">
              {liveTrades.length > 0 && (
                <span className="mono text-[10px] text-accent-purple animate-pulse">
                  {liveTrades.length} LIVE OPEN
                </span>
              )}
              <span className="mono text-[10px] text-ink-dim uppercase tracking-widest">
                {trades.length} entries
              </span>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="mono text-[10px] uppercase tracking-widest text-ink-dim bg-bg-raised/40 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-normal">Time</th>
                  <th className="text-left px-3 py-2 font-normal">Dir</th>
                  <th className="text-right px-3 py-2 font-normal">Entry</th>
                  <th className="text-right px-3 py-2 font-normal">Exit</th>
                  <th className="text-right px-3 py-2 font-normal">Size</th>
                  <th className="text-right px-3 py-2 font-normal" title="+ = price above entry  ·  − = price below entry">SL</th>
                  <th className="text-right px-3 py-2 font-normal" title="+ = price above entry  ·  − = price below entry">TP</th>
                  <th className="text-right px-3 py-2 font-normal" title={marginIsEst ? "estimated at 5%" : "from Capital market info"}>
                    Margin{marginIsEst ? "*" : ""}
                  </th>
                  <th className="text-right px-3 py-2 font-normal">P&amp;L</th>
                  <th className="text-center px-3 py-2 font-normal">Status</th>
                  <th className="text-center px-3 py-2 font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-ink-dim mono text-xs">
                      No trades yet — log one with the form →
                    </td>
                  </tr>
                )}
                {trades.map((t) => {
                  const pnlTone =
                    t.pnl === null ? "text-ink-muted"
                    : t.pnl >= 0 ? "text-accent-green"
                    : "text-accent-red";
                  const dirTone = t.direction === "LONG" ? "text-accent-green" : "text-accent-red";
                  const entryPrice = t.fillPrice ?? t.entry;
                  const displayEntry = entryPrice.toFixed(2);

                  // Signed % from entry: + = price above entry, − = below
                  const pctFromEntry = (level: number | null) =>
                    level == null || entryPrice === 0 ? null : ((level - entryPrice) / entryPrice) * 100;
                  const slPct = pctFromEntry(t.stopLoss);
                  const tpPct = pctFromEntry(t.takeProfit);
                  const fmtPct = (p: number | null) =>
                    p == null ? "" : ` ${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(2)}%`;

                  // Margin estimate. Capital GOLD: margin = size × entry × marginFactor/100
                  const marginUSD =
                    marginFactor != null
                      ? t.size * entryPrice * (marginFactor / 100)
                      : null;

                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-line/60 last:border-b-0 ${t.isLive ? "bg-accent-purple/5" : ""}`}
                    >
                      <td className="px-3 py-2 mono text-[11px] text-ink-muted">
                        {new Date(t.createdAt).toLocaleTimeString("en-GB")}
                      </td>
                      <td className={`px-3 py-2 mono text-[11px] font-bold ${dirTone}`}>
                        {t.direction}
                        {t.isLive && (
                          <span className="ml-1 text-accent-purple text-[9px]">●</span>
                        )}
                      </td>
                      <td className="px-3 py-2 mono text-right">{displayEntry}</td>
                      <td className="px-3 py-2 mono text-right">{t.exit?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2 mono text-right">{t.size}</td>
                      <td className="px-3 py-2 mono text-right text-[11px] text-accent-red">
                        {t.stopLoss != null
                          ? <>{t.stopLoss.toFixed(2)}<span className="text-[10px] opacity-80">{fmtPct(slPct)}</span></>
                          : <span className="text-ink-dim">—</span>}
                      </td>
                      <td className="px-3 py-2 mono text-right text-[11px] text-accent-green">
                        {t.takeProfit != null
                          ? <>{t.takeProfit.toFixed(2)}<span className="text-[10px] opacity-80">{fmtPct(tpPct)}</span></>
                          : <span className="text-ink-dim">—</span>}
                      </td>
                      <td className="px-3 py-2 mono text-right text-[11px] text-ink-muted">
                        {marginUSD != null
                          ? `$${marginUSD.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : <span className="text-ink-dim">—</span>}
                      </td>
                      <td className={`px-3 py-2 mono text-right ${pnlTone}`}>
                        {t.pnl === null ? "—" : `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 mono text-center text-[11px] text-ink-muted">
                        {t.status}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {t.isLive && t.status === "OPEN" && (
                          <button
                            onClick={() => closeLiveTrade(t.id)}
                            disabled={closing === t.id}
                            className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-accent-red/10 text-accent-red border border-accent-red/30 hover:bg-accent-red/20 transition-colors disabled:opacity-40"
                          >
                            {closing === t.id ? "…" : "Close"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Entry Form */}
        <form onSubmit={submit} className="panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="display text-sm font-semibold">New Trade</div>
            <button
              type="button"
              onClick={() => setIsLive(!isLive)}
              className={[
                "mono text-[10px] uppercase tracking-widest px-3 py-1 rounded border transition-colors",
                isLive
                  ? "bg-accent-purple/15 text-accent-purple border-accent-purple/40"
                  : "bg-bg-raised text-ink-dim border-line hover:text-ink",
              ].join(" ")}
            >
              {isLive ? "● Live" : "○ Journal"}
            </button>
          </div>

          {isLive && (
            <div className="mono text-[10px] text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded px-3 py-2 leading-relaxed">
              ⚠ LIVE MODE — sends market order to Capital.com
            </div>
          )}

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

          {!isLive && (
            <Field label="Entry Price">
              <input
                type="number" step="0.01" required value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="inp" placeholder="e.g. 3320.00"
              />
            </Field>
          )}

          <Field label="Size (oz)">
            <input
              type="number" step="0.01" min="0.01" required value={size}
              onChange={(e) => setSize(e.target.value)}
              className="inp" placeholder="0.1"
            />
          </Field>

          {isLive && (
            <>
              <Field label="Stop Loss (optional)">
                <input
                  type="number" step="0.01" value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="inp" placeholder="e.g. 3290.00"
                />
              </Field>
              <Field label="Take Profit (optional)">
                <input
                  type="number" step="0.01" value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="inp" placeholder="e.g. 3380.00"
                />
              </Field>
            </>
          )}

          {!isLive && (
            <Field label="Exit (blank = open)">
              <input
                type="number" step="0.01" value={exit}
                onChange={(e) => setExit(e.target.value)}
                className="inp" placeholder="leave blank if still open"
              />
            </Field>
          )}

          <Field label="Notes">
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="inp" placeholder="optional"
            />
          </Field>

          {err && <div className="mono text-[11px] text-accent-red">{err}</div>}
          {successMsg && <div className="mono text-[11px] text-accent-green">{successMsg}</div>}

          <button
            type="submit"
            disabled={submitting}
            className={[
              "mono text-xs uppercase tracking-widest py-2 rounded border transition-colors disabled:opacity-50",
              isLive
                ? "bg-accent-purple/15 text-accent-purple border-accent-purple/40 hover:bg-accent-purple/25"
                : "bg-accent-blue/15 text-accent-blue border-accent-blue/40 hover:bg-accent-blue/25",
            ].join(" ")}
          >
            {submitting ? "executing…" : isLive ? "▶ Execute Live Order" : "Save Journal Entry"}
          </button>

          <style jsx>{`
            .inp {
              background: #0a0c10;
              border: 1px solid #1f242d;
              border-radius: 6px;
              padding: 6px 10px;
              font-family: var(--font-space-mono), monospace;
              font-size: 13px;
              color: #e6e9ef;
              width: 100%;
            }
            .inp:focus { outline: none; border-color: #63B3ED; }
          `}</style>
        </form>
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

function AccountStat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-accent-green" : tone === "red" ? "text-accent-red" : "text-ink";
  return (
    <div className="flex flex-col gap-1">
      <span className="mono text-[10px] uppercase tracking-widest text-ink-dim">{label}</span>
      <span className={`mono text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
