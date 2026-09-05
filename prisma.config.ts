import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI does not read Next's .env.local on its own, so load it here.
// Later files do not override earlier ones, so .env.local wins.
loadEnv({ path: [".env.local", ".env"], quiet: true });

/**
 * `env()` resolves when this file loads and throws if the variable is missing.
 * Every Prisma command loads the config, including `prisma generate`, which
 * needs no database at all — in Prisma 7 the client is generated from the
 * schema and the connection comes from the driver adapter at runtime. Declaring
 * the datasource unconditionally therefore made DIRECT_URL a requirement of
 * `npm run build`, which fails a deploy that only sets the runtime DATABASE_URL.
 *
 * So the datasource is declared only when the variable is actually there.
 * Commands that genuinely need a direct connection — migrate, db push,
 * introspection — still refuse to run without one.
 */
const directUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",

  ...(directUrl
    ? {
        // Migrations and introspection use the direct (unpooled) connection.
        // Runtime queries go through the pooled DATABASE_URL via the driver
        // adapter in src/lib/db.ts — a pooler cannot run DDL reliably.
        datasource: { url: env("DIRECT_URL") },
      }
    : {}),

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
