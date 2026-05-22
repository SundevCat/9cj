import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemoryPage } from "./_components/MemoryPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Memory / Audit</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Searchable log of every decision, action, and event
          </p>
        </div>
        <StatusBadge label="SQLITE · INDEXED" tone="purple" />
      </header>

      <MemoryPage />
    </div>
  );
}
