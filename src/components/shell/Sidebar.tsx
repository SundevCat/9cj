"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Daily Briefing", href: "/briefing" },
      { label: "AI Agents", href: "/agents" },
      { label: "Manual (TH)", href: "/manual" },
    ],
  },
  {
    group: "Trading",
    items: [
      { label: "Quant XAU Desk", href: "/xau" },
      { label: "Backtest Lab", href: "/backtest" },
      { label: "Finance / P&L", href: "/finance" },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Smart Home Ops", href: "/home-ops" },
      { label: "ProductOps", href: "/product-ops" },
      { label: "DevOps", href: "/devops" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Memory / Audit", href: "/memory" },
      { label: "Policy Governance", href: "/policy" },
      { label: "Human-in-Loop", href: "/approvals" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] shrink-0 border-r border-line bg-bg-panel min-h-full">
      <nav className="p-3 flex flex-col gap-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="mono text-[10px] uppercase tracking-widest text-ink-dim px-2 mb-2">
              {group.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
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
          </div>
        ))}
      </nav>
      <div className="mt-auto p-3 mono text-[10px] text-ink-dim border-t border-line">
        v0.1.0 · localhost
      </div>
    </aside>
  );
}
