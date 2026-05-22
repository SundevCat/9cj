import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApprovalsPage } from "./_components/ApprovalsPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Human-in-Loop</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Approve / reject actions flagged by policy
          </p>
        </div>
        <StatusBadge label="HIL QUEUE" tone="amber" />
      </header>

      <ApprovalsPage />
    </div>
  );
}
