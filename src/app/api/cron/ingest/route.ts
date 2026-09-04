import { NextResponse, type NextRequest } from "next/server";

import { ADAPTERS, runIngest } from "@/lib/ingest";

export const dynamic = "force-dynamic";
// Three feeds fetched serially; well inside Vercel's limit but not instant.
export const maxDuration = 60;

/**
 * Scheduled feed ingestion.
 *
 * Writes into the CrisisFeedItem review queue only. Nothing published on the
 * site changes as a result of this running — an editor still has to promote an
 * item to a NewsPost. Automatically republishing third-party humanitarian
 * reporting under our own masthead would be both a rights problem and an
 * editorial one.
 */
function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Fail closed. An unset secret must not mean "anyone may trigger ingestion".
  if (!secret) return false;

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    // Deliberately terse: no hint about whether the secret is unset or wrong.
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = await runIngest(ADAPTERS);

  const failed = results.filter((r) => r.status === "failed");

  for (const result of results) {
    const detail = result.message ? ` — ${result.message}` : "";
    console.log(
      `[ingest] ${result.label}: ${result.status} (${result.created} new, ${result.updated} updated)${detail}`,
    );
  }

  return NextResponse.json(
    {
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      results,
    },
    {
      // 207 when some sources worked and others did not, so a monitor can tell
      // a partial run from a clean one without parsing the body.
      status: failed.length === 0 ? 200 : failed.length === results.length ? 500 : 207,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
