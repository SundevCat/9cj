type Tone = "blue" | "green" | "amber" | "red" | "purple" | "neutral";

const TONE: Record<Tone, { text: string; dot: string; ring: string }> = {
  blue:    { text: "text-accent-blue",   dot: "bg-accent-blue",   ring: "ring-accent-blue/30"   },
  green:   { text: "text-accent-green",  dot: "bg-accent-green",  ring: "ring-accent-green/30"  },
  amber:   { text: "text-accent-amber",  dot: "bg-accent-amber",  ring: "ring-accent-amber/30"  },
  red:     { text: "text-accent-red",    dot: "bg-accent-red",    ring: "ring-accent-red/30"    },
  purple:  { text: "text-accent-purple", dot: "bg-accent-purple", ring: "ring-accent-purple/30" },
  neutral: { text: "text-ink-muted",     dot: "bg-ink-muted",     ring: "ring-ink-muted/30"     },
};

export function StatusBadge({
  label,
  tone = "neutral",
  pulse = false,
}: {
  label: string;
  tone?: Tone;
  pulse?: boolean;
}) {
  const c = TONE[tone];
  return (
    <span
      className={`mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg-raised border border-line ring-1 ${c.ring} ${c.text} inline-flex items-center gap-1.5`}
    >
      <span className={`relative inline-block h-1.5 w-1.5 rounded-full ${c.dot}`}>
        {pulse && (
          <span
            className={`absolute inset-0 rounded-full ${c.dot} opacity-60 animate-ping`}
          />
        )}
      </span>
      {label}
    </span>
  );
}
