import { StatusBadge } from "@/components/ui/StatusBadge";
import { HomeOpsPage } from "./_components/HomeOpsPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Smart Home Ops</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Home Assistant · devices · modes · energy
          </p>
        </div>
        <StatusBadge label="HASS · MOCK" tone="blue" />
      </header>

      <HomeOpsPage />
    </div>
  );
}
