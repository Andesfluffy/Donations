import { config as loadEnv } from "dotenv";

// Tests that touch the database read the same local connection the dev server
// uses. Suites requiring it skip themselves when DATABASE_URL is absent.
loadEnv({ path: [".env.local", ".env"], quiet: true });
