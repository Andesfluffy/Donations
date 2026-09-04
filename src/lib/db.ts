import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma 7 has no Rust query engine: the connection is owned by a driver
 * adapter we construct here, not by a `url` in schema.prisma. Runtime queries
 * use the pooled DATABASE_URL; migrations use DIRECT_URL via prisma.config.ts.
 */
function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
  }

  /**
   * Pool size. Ten is right for real Postgres, where pages fire their
   * independent queries concurrently.
   *
   * Set DATABASE_POOL_MAX=1 when pointing at `prisma dev`: that local server is
   * PGlite, an embedded single-user Postgres, and it drops the connection if a
   * second one is opened. That is a limitation of the dev database only — do
   * not serialise deployed environments to accommodate it.
   */
  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);

  const adapter = new PrismaPg({ connectionString, max });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * One client per process. Next's dev server re-evaluates modules on every hot
 * reload, so without this cache each edit leaks a connection pool until
 * Postgres starts refusing new clients.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
