import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

type Tone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

export function ModuleCard({
  title,
  description,
  href,
  status = "READY",
  tone = "blue",
}: {
  title: string;
  description: string;
  href: string;
  status?: string;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="panel p-4 flex flex-col gap-3 hover:border-accent-blue/40 hover:shadow-glow transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="display text-base font-semibold group-hover:text-accent-blue transition-colors">
          {title}
        </h3>
        <StatusBadge label={status} tone={tone} />
      </div>
      <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
      <div className="mono text-[10px] text-ink-dim mt-auto uppercase tracking-widest">
        Open →
      </div>
    </Link>
  );
}
