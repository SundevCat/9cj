import { StatusBadge } from "@/components/ui/StatusBadge";
import { AgentsPage } from "./_components/AgentsPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Task queue · module router · activity feed
          </p>
        </div>
        <StatusBadge label="AGENTS LIVE" tone="green" pulse />
      </header>

      <AgentsPage />
    </div>
  );
}
