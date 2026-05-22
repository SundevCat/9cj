import { StatusBadge } from "@/components/ui/StatusBadge";
import { BacktestLab } from "./_components/BacktestLab";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Backtest Lab</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Historical OHLCV · RSI / MACD / EMA · stats
          </p>
        </div>
        <StatusBadge label="LOCAL ENGINE" tone="purple" />
      </header>

      <BacktestLab />
    </div>
  );
}
