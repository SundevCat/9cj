import { prisma } from "./prisma";
import { recordMemory } from "./memory";

// Action payload that gets evaluated against active policies.
export type ActionContext = {
  module: string;          // e.g. "xau", "finance", "home-ops"
  action: string;          // e.g. "open_trade", "log_expense", "device_toggle"
  size?: number;           // trade size, spend amount, etc.
  pnl?: number;
  description?: string;
  raw?: Record<string, unknown>;
};

export type PolicyHit = {
  policyId: number;
  name: string;
  ruleType: string;
  threshold: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

export type PolicyResult = {
  allowed: boolean;        // false if any HIGH-severity policy blocks
  hits: PolicyHit[];       // every policy that matched (allowed or blocking)
};

// Map ruleType → comparator. Each rule says "if metric > threshold, this is a
// violation (severity HIGH = blocking, MEDIUM = warn-only)."
function evaluate(ctx: ActionContext, rule: { ruleType: string; threshold: number }): { hit: boolean; severity: "HIGH" | "MEDIUM"; reason: string } | null {
  switch (rule.ruleType) {
    case "MAX_TRADE_SIZE": {
      if (ctx.action !== "open_trade") return null;
      const size = Math.abs(ctx.size ?? 0);
      const hit = size > rule.threshold;
      return hit ? { hit, severity: "HIGH", reason: `trade size ${size} exceeds ${rule.threshold}` } : null;
    }
    case "DAILY_LOSS": {
      if (ctx.action !== "open_trade") return null;
      const loss = -(ctx.pnl ?? 0);
      const hit = loss > rule.threshold;
      return hit ? { hit, severity: "HIGH", reason: `today's loss ${loss} exceeds ${rule.threshold}` } : null;
    }
    case "SPEND_LIMIT": {
      if (ctx.action !== "log_expense") return null;
      const amount = Math.abs(ctx.size ?? 0);
      const hit = amount > rule.threshold;
      return hit ? { hit, severity: amount > rule.threshold * 1.5 ? "HIGH" : "MEDIUM", reason: `expense ${amount} exceeds ${rule.threshold}` } : null;
    }
    case "DEVICE_QUOTA": {
      if (ctx.action !== "device_toggle") return null;
      const count = ctx.size ?? 0;
      const hit = count > rule.threshold;
      return hit ? { hit, severity: "MEDIUM", reason: `${count} devices toggled exceeds ${rule.threshold}/hour` } : null;
    }
    default:
      return null;
  }
}

export async function checkPolicies(ctx: ActionContext): Promise<PolicyResult> {
  const policies = await prisma.policy.findMany({ where: { enabled: true } });
  const hits: PolicyHit[] = [];
  for (const p of policies) {
    const ev = evaluate(ctx, p);
    if (!ev) continue;
    hits.push({
      policyId: p.id,
      name: p.name,
      ruleType: p.ruleType,
      threshold: p.threshold,
      severity: ev.severity,
      reason: ev.reason,
    });
  }
  const blocking = hits.some((h) => h.severity === "HIGH");
  return { allowed: !blocking, hits };
}

export async function recordViolation(
  hit: PolicyHit,
  ctx: ActionContext,
  taskId: number | null = null
) {
  await prisma.$transaction([
    prisma.violation.create({
      data: {
        policyId: hit.policyId,
        module: ctx.module,
        action: ctx.action,
        context: JSON.stringify({ ...ctx, reason: hit.reason }),
        severity: hit.severity,
        taskId: taskId ?? undefined,
      },
    }),
    prisma.policy.update({
      where: { id: hit.policyId },
      data: { violations: { increment: 1 } },
    }),
  ]);
  await recordMemory("policy.guard", "POLICY", `${hit.name}: ${hit.reason}`, { ctx, hit });
}
