import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriceTicker } from "./_components/PriceTicker";
import { SignalDashboard } from "./_components/SignalDashboard";
import { CandlestickChart } from "./_components/CandlestickChart";
import { AutoTraderPanel } from "./_components/AutoTraderPanel";
import { TradeJournal } from "./_components/TradeJournal";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">
            Quant XAU Desk
          </h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Live gold · RSI / MACD / EMA · auto-trader · journal
          </p>
        </div>
        <StatusBadge label="LIVE · 30s" tone="amber" pulse />
      </header>

      <PriceTicker refreshMs={30_000} />

      <SignalDashboard refreshMs={30_000} />

      <CandlestickChart height={380} />

      <AutoTraderPanel />

      <TradeJournal />
    </div>
  );
}
