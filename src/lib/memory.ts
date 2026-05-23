import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type MemoryTag = "TRADE" | "POLICY" | "AI" | "SYS" | "OK" | "WARN" | "ERR";

export async function recordMemory(
  agent: string,
  tag: MemoryTag,
  message: string,
  metadata?: Record<string, unknown>
) {
  return prisma.memory.create({
    data: {
      agent,
      tag,
      message,
      // Prisma's Json? field needs Prisma.JsonNull for explicit null;
      // raw `null` isn't accepted by the generated types.
      // Cast to InputJsonValue — Record<string, unknown> is structurally JSON-safe at runtime.
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}
