"use client";

import { useStream } from "./StreamProvider";

const SEVERITY_TONE: Record<string, string> = {
  HIGH:   "border-accent-red/50 bg-accent-red/10",
  MEDIUM: "border-accent-amber/50 bg-accent-amber/10",
  LOW:    "border-accent-blue/50 bg-accent-blue/10",
};

const SEVERITY_TEXT: Record<string, string> = {
  HIGH: "text-accent-red",
  MEDIUM: "text-accent-amber",
  LOW: "text-accent-blue",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useStream();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`panel-raised border ${SEVERITY_TONE[t.severity]} p-3 flex items-start gap-3 shadow-glow animate-in slide-in-from-right`}
        >
          <div className={`mono text-[10px] uppercase tracking-widest ${SEVERITY_TEXT[t.severity]} pt-0.5`}>
            {t.severity}
          </div>
          <div className="flex-1 min-w-0">
            <div className="mono text-sm font-bold text-ink truncate">{t.title}</div>
            <div className="mono text-[11px] text-ink-muted truncate">{t.message}</div>
            <div className="mono text-[10px] text-ink-dim mt-1">{t.module} · just now</div>
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="mono text-[10px] text-ink-dim hover:text-ink shrink-0"
            aria-label="dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
