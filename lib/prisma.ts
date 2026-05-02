import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Bump when Task model / Prisma client shape changes.
 * Prevents a stale PrismaClient on globalThis after `prisma generate` (Next dev HMR
 * can keep the old instance, which then throws e.g. "Unknown argument `category`").
 */
const PRISMA_SCHEMA_TAG = "task-v3-category-notes";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaTag: string | undefined;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma && globalForPrisma.prismaSchemaTag === PRISMA_SCHEMA_TAG) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaSchemaTag = undefined;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaTag = PRISMA_SCHEMA_TAG;
  return client;
}
