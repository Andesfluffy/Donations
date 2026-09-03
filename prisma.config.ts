import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI does not read Next's .env.local on its own, so load it here.
// Later files do not override earlier ones, so .env.local wins.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    // Migrations and introspection use the direct (unpooled) connection.
    // Runtime queries go through the pooled DATABASE_URL via the driver
    // adapter in src/lib/db.ts — a pooler cannot run DDL reliably.
    url: env("DIRECT_URL"),
  },

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
