type Tone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

const TONE: Record<Tone, string> = {
  blue: "text-accent-blue",
  green: "text-accent-green",
  amber: "text-accent-amber",
  red: "text-accent-red",
  purple: "text-accent-purple",
  neutral: "text-ink",
};

export function MetricCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: Tone;
  hint?: string;
}) {
  const deltaTone =
    delta?.startsWith("-") ? "text-accent-red" :
    delta?.startsWith("+") ? "text-accent-green" :
    "text-ink-muted";

  return (
    <div className="panel p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim">
          {label}
        </div>
        {delta && (
          <div className={`mono text-[11px] ${deltaTone}`}>{delta}</div>
        )}
      </div>
      <div className={`mono text-2xl font-bold ${TONE[tone]}`}>{value}</div>
      {hint && (
        <div className="mono text-[10px] text-ink-dim">{hint}</div>
      )}
    </div>
  );
}
