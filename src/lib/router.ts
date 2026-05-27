import { prisma } from "./prisma";
import { checkPolicies, recordViolation, type ActionContext } from "./policy";
import { recordMemory } from "./memory";

// Decides where an action goes: straight through, queued for human approval,
// or rejected by a HIGH-severity policy.
export type RouteResult = {
  decision: "ALLOWED" | "QUEUED_FOR_APPROVAL";
  taskId: string | null;
  hits: Awaited<ReturnType<typeof checkPolicies>>["hits"];
};

export async function routeAction(ctx: ActionContext): Promise<RouteResult> {
  const result = await checkPolicies(ctx);

  // No matches at all — allow + log to memory.
  if (result.hits.length === 0) {
    await recordMemory(`${ctx.module}.router`, "AI", `routed ${ctx.action} · clean`, { ctx });
    return { decision: "ALLOWED", taskId: null, hits: [] };
  }

  // At least one match. If any HIGH severity → block + queue a HIL task.
  if (!result.allowed) {
    const priority = result.hits.some((h) => h.severity === "HIGH") ? "HIGH" : "MEDIUM";
    const task = await prisma.task.create({
      data: {
        title: `[${ctx.module}] ${ctx.action}`,
        module: ctx.module,
        priority,
        status: "PENDING",
        metadata: { ctx, hits: result.hits } as object,
      },
    });
    for (const hit of result.hits) {
      await recordViolation(hit, ctx, task.id);
    }
    return { decision: "QUEUED_FOR_APPROVAL", taskId: task.id, hits: result.hits };
  }

  // Hit some non-blocking policies (warn-only) — let it through but log them.
  for (const hit of result.hits) {
    await recordViolation(hit, ctx, null);
  }
  await recordMemory(`${ctx.module}.router`, "WARN", `routed ${ctx.action} · ${result.hits.length} policy warning(s)`, { ctx, hits: result.hits });
  return { decision: "ALLOWED", taskId: null, hits: result.hits };
}
