"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Quant XAU Desk", href: "/xau" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] shrink-0 border-r border-line bg-bg-panel flex flex-col h-full">
      <nav className="p-3 flex flex-col gap-0.5 flex-1 overflow-y-auto">
        <div className="mono text-[10px] uppercase tracking-widest text-ink-dim px-2 mb-2">
          Navigation
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "block px-2 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-bg-raised text-ink border border-line"
                      : "text-ink-muted hover:text-ink hover:bg-bg-raised/60",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 mono text-[10px] text-ink-dim border-t border-line shrink-0">
        v0.1.0 · localhost
      </div>
    </aside>
  );
}
