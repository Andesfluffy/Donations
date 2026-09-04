import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Suites share one local database; running files in parallel would let
    // them clear each other's rows mid-assertion.
    fileParallelism: false,
    // …and one *process*, not just one at a time. The dev database is PGlite,
    // which accepts a single connection: with a worker per file, an outgoing
    // worker's connection could still be open as the next one connected, and
    // PGlite drops one of them. That surfaced as an intermittent failure in
    // the webhook suite which passed on its own every time.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
