import { LiveStatusPills } from "./LiveStatusPills";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg-panel/95 backdrop-blur flex items-center justify-between px-5">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-accent-blue to-accent-purple grid place-items-center text-bg-base font-bold mono text-sm">
          9
        </div>
        <div className="flex flex-col leading-tight">
          <span className="display text-base font-bold tracking-tight">
            9CJ Corp
          </span>
          <span className="mono text-[10px] text-ink-muted uppercase tracking-widest">
            Personal AI Operating System
          </span>
        </div>
      </div>
      <LiveStatusPills />
    </header>
  );
}
