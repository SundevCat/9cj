import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchSpotXAU } from "@/lib/goldApi";
import { ensurePriceHistory, recordTick } from "@/lib/seed";
import { tick as autoTraderTick } from "@/lib/autoTrader";

export const dynamic = "force-dynamic";

type StreamEvent =
  | { type: "tick"; time: number }
  | { type: "price"; value: number; delta: number; source: string }
  | { type: "memory"; entry: { id: string; agent: string; tag: string; message: string; createdAt: string } }
  | { type: "alert"; severity: "HIGH" | "MEDIUM" | "LOW"; title: string; message: string; module: string }
  | { type: "metrics"; servicesHealthy: number; servicesTotal: number; approvalsPending: number; pricePerf: number };

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let memoryCursor: Date = new Date();
  let taskCursor: Date = new Date();
  let violationCursor: Date = new Date();
  let stopped = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Seed cursors so we only emit things created after stream open
      const [latestMem, latestTask, latestVio] = await Promise.all([
        prisma.memory.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.task.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.violation.findFirst({ orderBy: { ts: "desc" }, select: { ts: true } }),
      ]);
      memoryCursor = latestMem?.createdAt ?? new Date(0);
      taskCursor = latestTask?.createdAt ?? new Date(0);
      violationCursor = latestVio?.ts ?? new Date(0);

      function send(event: StreamEvent) {
        if (stopped) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          stopped = true;
        }
      }

      send({ type: "tick", time: Date.now() });

      async function pulse() {
        if (stopped) return;
        try {
          await ensurePriceHistory(200);
          const spot = await fetchSpotXAU();
          await recordTick(spot.price);
          const last2 = await prisma.price.findMany({ orderBy: { timestamp: "desc" }, take: 2 });
          const prev = last2[1]?.close ?? spot.price;
          const delta = spot.price - prev;
          send({ type: "price", value: spot.price, delta: Number(delta.toFixed(2)), source: spot.source });

          const fresh = await prisma.memory.findMany({
            where: { createdAt: { gt: memoryCursor } },
            orderBy: { createdAt: "asc" },
            take: 25,
          });
          for (const m of fresh) {
            memoryCursor = m.createdAt;
            send({
              type: "memory",
              entry: {
                id: m.id,
                agent: m.agent,
                tag: m.tag,
                message: m.message,
                createdAt: m.createdAt.toISOString(),
              },
            });
          }

          const vios = await prisma.violation.findMany({
            where: { ts: { gt: violationCursor } },
            orderBy: { ts: "asc" },
            take: 10,
          });
          for (const v of vios) {
            violationCursor = v.ts;
            const policy = await prisma.policy.findUnique({ where: { id: v.policyId } });
            send({
              type: "alert",
              severity: v.severity as "HIGH" | "MEDIUM" | "LOW",
              title: policy?.name ?? `Policy ${v.policyId}`,
              message: `${v.module} · ${v.action}`,
              module: v.module,
            });
          }

          const tasks = await prisma.task.findMany({
            where: { createdAt: { gt: taskCursor } },
            orderBy: { createdAt: "asc" },
            take: 10,
          });
          for (const t of tasks) {
            taskCursor = t.createdAt;
            if (t.status === "PENDING") {
              send({
                type: "alert",
                severity: t.priority as "HIGH" | "MEDIUM" | "LOW",
                title: "Approval requested",
                message: t.title,
                module: t.module,
              });
            }
          }

          const approvalsPending = await prisma.task.count({ where: { status: "PENDING" } });
          const recent = await prisma.price.findMany({ orderBy: { timestamp: "desc" }, take: 100 });
          const pricePerf = recent.length > 1 ? (recent[0].close - recent[recent.length - 1].close) / recent[recent.length - 1].close : 0;

          send({
            type: "metrics",
            servicesHealthy: 0,
            servicesTotal: 0,
            approvalsPending,
            pricePerf: Number((pricePerf * 100).toFixed(3)),
          });

          try {
            const at = await autoTraderTick();
            if (at.action !== "NONE" && at.action !== "HOLD") {
              send({
                type: "alert",
                severity: at.action === "ERROR" ? "HIGH" : at.action === "QUEUED" ? "HIGH" : "MEDIUM",
                title: `Autotrader · ${at.action}`,
                message: at.detail,
                module: "xau",
              });
            }
          } catch {
            // swallow — keep pulse alive
          }
        } catch (e) {
          send({
            type: "memory",
            entry: {
              id: "stream-error",
              agent: "stream",
              tag: "ERR",
              message: `pulse error: ${(e as Error).message}`,
              createdAt: new Date().toISOString(),
            },
          });
        }
      }

      pulse();
      const interval = setInterval(pulse, 5000);

      req.signal.addEventListener("abort", () => {
        stopped = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      stopped = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
