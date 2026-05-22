import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductOpsBoard } from "./_components/ProductOpsBoard";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">ProductOps</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Kanban · drag &amp; drop · backlog → done
          </p>
        </div>
        <StatusBadge label="DND-KIT" tone="blue" />
      </header>

      <ProductOpsBoard />
    </div>
  );
}
