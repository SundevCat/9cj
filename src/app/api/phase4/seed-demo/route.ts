import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

// Loads a believable slice of Phase 4 data so the dashboards aren't empty
// on first open: 4 policies, a Kanban board, and a few memory events.
export async function POST() {
  await prisma.$transaction([
    prisma.violation.deleteMany(),
    prisma.policy.deleteMany(),
    prisma.kanbanCard.deleteMany(),
    prisma.task.deleteMany(),
  ]);

  await prisma.policy.createMany({
    data: [
      { name: "Max trade size",     description: "Block trades larger than 0.5 lot",       ruleType: "MAX_TRADE_SIZE", threshold: 0.5 },
      { name: "Daily loss circuit", description: "Block new trades after 5,000 daily loss", ruleType: "DAILY_LOSS",     threshold: 5_000 },
      { name: "SaaS spend ceiling", description: "Warn on single SaaS charges above 3,000", ruleType: "SPEND_LIMIT",    threshold: 3_000 },
      { name: "Device toggle quota",description: "Warn after 20 device toggles per hour",   ruleType: "DEVICE_QUOTA",   threshold: 20  },
    ],
  });

  await prisma.kanbanCard.createMany({
    data: [
      // BACKLOG
      { title: "Ship Phase 5 — SSE real-time updates",          moduleTag: "system",   priority: "HIGH",   status: "BACKLOG",     position: 0 },
      { title: "Wire Claude API into chat panel",                moduleTag: "ai",       priority: "MEDIUM", status: "BACKLOG",     position: 1 },
      { title: "Add CSV importer test coverage",                 moduleTag: "finance",  priority: "LOW",    status: "BACKLOG",     position: 2 },
      // IN_PROGRESS
      { title: "ProductOps Kanban drag/drop",                    moduleTag: "product",  priority: "HIGH",   status: "IN_PROGRESS", position: 0 },
      { title: "Policy engine — add hourly counters",            moduleTag: "policy",   priority: "MEDIUM", status: "IN_PROGRESS", position: 1 },
      // REVIEW
      { title: "Smart Home mock fleet polish",                   moduleTag: "home-ops", priority: "LOW",    status: "REVIEW",      position: 0 },
      // DONE
      { title: "Phase 3 finance dashboards",                     moduleTag: "finance",  priority: "MEDIUM", status: "DONE",        position: 0 },
      { title: "Phase 2 XAU desk live ticker",                   moduleTag: "xau",      priority: "HIGH",   status: "DONE",        position: 1 },
      { title: "Phase 1 OS shell + dark theme",                  moduleTag: "system",   priority: "MEDIUM", status: "DONE",        position: 2 },
    ],
  });

  // A few demo memory entries so the audit feed isn't empty.
  await recordMemory("system.boot",   "SYS",  "Phase 4 demo seed completed", { phase: 4 });
  await recordMemory("xau.signals",   "TRADE", "RSI(14) crossed 30 — BUY staged", { rsi: 29.4 });
  await recordMemory("memory.write",  "OK",    "Indexed 1,204 memory entries", { count: 1204 });
  await recordMemory("policy.guard",  "POLICY","Loaded 4 active policies", { count: 4 });
  await recordMemory("home.mode",     "SYS",   "Switched to WORK profile · desk lights 60%", { from: "HOME", to: "WORK" });
  await recordMemory("devops.ping",   "OK",    "All 6 services healthy · p95 142ms", { p95: 142 });
  await recordMemory("router.allow",  "AI",    "routed open_trade · clean", { module: "xau" });

  return NextResponse.json({ ok: true });
}
