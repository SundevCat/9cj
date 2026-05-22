import { StatusBadge } from "@/components/ui/StatusBadge";
import { FinancePage } from "./_components/FinancePage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Finance / P&L</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Income · expenses · budget · portfolio
          </p>
        </div>
        <StatusBadge label="THB · LOCAL" tone="green" />
      </header>

      <FinancePage />
    </div>
  );
}
