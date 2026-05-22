import { StatusBadge } from "./StatusBadge";

export function ModulePlaceholder({
  title,
  subtitle,
  phase,
  bullets,
}: {
  title: string;
  subtitle: string;
  phase: string;
  bullets: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mono text-xs text-ink-muted mt-1 uppercase tracking-widest">
            {subtitle}
          </p>
        </div>
        <StatusBadge label={phase} tone="purple" />
      </header>

      <div className="panel p-6 flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          This module shell is ready. The functional build lands in a later phase
          per the 9CJ Corp Build Plan.
        </p>
        <div>
          <div className="mono text-[10px] uppercase tracking-widest text-ink-dim mb-2">
            Planned scope
          </div>
          <ul className="flex flex-col gap-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-accent-blue mono mt-0.5">›</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
