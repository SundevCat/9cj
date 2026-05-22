import { StatusBadge } from "@/components/ui/StatusBadge";
import { DevOpsPage } from "./_components/DevOpsPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">DevOps</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Uptime · service health · deploy log
          </p>
        </div>
        <StatusBadge label="HTTP PING" tone="blue" />
      </header>

      <DevOpsPage />
    </div>
  );
}
