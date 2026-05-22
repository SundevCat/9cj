import { StatusBadge } from "@/components/ui/StatusBadge";
import { BriefingPage } from "./_components/BriefingPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Daily Briefing</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Morning summary · auto-generated from every module
          </p>
        </div>
        <StatusBadge label="08:00 BANGKOK" tone="amber" />
      </header>

      <BriefingPage />
    </div>
  );
}
