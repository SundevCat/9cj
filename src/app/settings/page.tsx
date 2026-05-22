import { StatusBadge } from "@/components/ui/StatusBadge";
import { SettingsPage } from "./_components/SettingsPage";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            Appearance · demos · integrations
          </p>
        </div>
        <StatusBadge label="LOCAL ONLY" tone="purple" />
      </header>

      <SettingsPage />
    </div>
  );
}
