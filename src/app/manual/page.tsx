import { StatusBadge } from "@/components/ui/StatusBadge";
import { ManualPage } from "./_components/ManualPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">
            คู่มือการใช้งาน
          </h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            User Manual · ภาษาไทย · ทุกโมดูล + Auto-Trader + FAQ
          </p>
        </div>
        <StatusBadge label="MANUAL · TH" tone="blue" />
      </header>

      <ManualPage />
    </div>
  );
}
