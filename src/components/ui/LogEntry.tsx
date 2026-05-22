type Tag = "TRADE" | "POLICY" | "AI" | "SYS" | "OK" | "WARN" | "ERR";

const TAG_TONE: Record<Tag, string> = {
  TRADE: "bg-accent-blue/15 text-accent-blue ring-accent-blue/30",
  POLICY: "bg-accent-purple/15 text-accent-purple ring-accent-purple/30",
  AI: "bg-accent-green/15 text-accent-green ring-accent-green/30",
  SYS: "bg-ink-muted/15 text-ink-muted ring-ink-muted/30",
  OK: "bg-accent-green/15 text-accent-green ring-accent-green/30",
  WARN: "bg-accent-amber/15 text-accent-amber ring-accent-amber/30",
  ERR: "bg-accent-red/15 text-accent-red ring-accent-red/30",
};

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function LogEntry({
  time,
  agent,
  tag,
  message,
}: {
  time: Date | string;
  agent: string;
  tag: Tag | string;
  message: string;
}) {
  const t = typeof time === "string" ? time : formatTime(time);
  const tone = TAG_TONE[tag as Tag] ?? TAG_TONE.SYS;
  return (
    <div className="flex items-start gap-3 px-3 py-2 border-b border-line/70 last:border-b-0 hover:bg-bg-raised/40 transition-colors">
      <span className="mono text-[11px] text-ink-dim tabular-nums shrink-0 w-20">
        {t}
      </span>
      <span
        className={`mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 ${tone} shrink-0`}
      >
        {tag}
      </span>
      <span className="mono text-[11px] text-ink-muted shrink-0 w-24 truncate">
        {agent}
      </span>
      <span className="text-sm text-ink truncate">{message}</span>
    </div>
  );
}
