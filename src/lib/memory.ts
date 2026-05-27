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
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}
