import { StatusBadge } from "@/components/ui/StatusBadge";
import { PolicyPage } from "./_components/PolicyPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Policy Governance</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Rules · violation log · guardrails
          </p>
        </div>
        <StatusBadge label="GUARDS ACTIVE" tone="purple" />
      </header>

      <PolicyPage />
    </div>
  );
}
