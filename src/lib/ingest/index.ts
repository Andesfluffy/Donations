import { db } from "@/lib/db";
import { caritasAdapter } from "@/lib/ingest/sources/caritas";
import { reliefwebAdapter } from "@/lib/ingest/sources/reliefweb";
import { vaticanNewsAdapter } from "@/lib/ingest/sources/vatican-news";
import type { FeedAdapter, IngestResult, NormalisedFeedItem } from "@/lib/ingest/types";

/** ReliefWeb first: it is the only source that can be skipped for missing
 *  configuration, so its status is the one worth seeing at the top of a run. */
export const ADAPTERS: FeedAdapter[] = [
  reliefwebAdapter,
  vaticanNewsAdapter,
  caritasAdapter,
];

/**
 * Store one adapter's items.
 *
 * Upserts on (source, externalId): a feed re-lists the same article on every
 * fetch, and a corrected headline should update in place rather than appear
 * twice. Crucially the update never touches `reviewedAt`, `dismissedAt` or
 * `promotedToPostId` — an editor's decision must survive the next cron run.
 */
export async function storeItems(items: NormalisedFeedItem[]): Promise<{
  created: number;
  updated: number;
}> {
  if (items.length === 0) return { created: 0, updated: 0 };

  // Which ids already exist, in one query rather than one per item. A
  // find-then-write per article turned a 60-item run into ~120 serial
  // round-trips, which overran the function's own time budget.
  const existing = await db.crisisFeedItem.findMany({
    where: {
      OR: items.map((item) => ({
        source: item.source,
        externalId: item.externalId,
      })),
    },
    select: { source: true, externalId: true },
  });

  const seen = new Set(existing.map((row) => `${row.source}:${row.externalId}`));

  await Promise.all(
    items.map((item) => {
      const data = {
        title: item.title,
        url: item.url,
        summary: item.summary,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        countryCodes: item.countryCodes,
        disasterTypes: item.disasterTypes,
        fetchedAt: new Date(),
      };

      return db.crisisFeedItem.upsert({
        where: {
          source_externalId: { source: item.source, externalId: item.externalId },
        },
        create: { source: item.source, externalId: item.externalId, ...data },
        // `data` deliberately excludes reviewedAt, dismissedAt and
        // promotedToPostId: an editor's decision must survive every later run
        // of the cron.
        update: data,
      });
    }),
  );

  let created = 0;
  for (const item of items) {
    if (!seen.has(`${item.source}:${item.externalId}`)) created++;
  }

  return { created, updated: items.length - created };
}

/**
 * Run every adapter.
 *
 * One source failing must not stop the others: a Vatican News outage should
 * not cost us the Caritas items in the same run. Each adapter's outcome is
 * reported separately so a persistent failure is visible rather than silent.
 */
export async function runIngest(adapters: FeedAdapter[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const adapter of adapters) {
    try {
      const items = await adapter.fetchItems();

      if (items === null) {
        results.push({
          source: adapter.source,
          label: adapter.label,
          status: "skipped",
          fetched: 0,
          created: 0,
          updated: 0,
          message: "Not configured",
        });
        continue;
      }

      const { created, updated } = await storeItems(items);

      results.push({
        source: adapter.source,
        label: adapter.label,
        status: "ok",
        fetched: items.length,
        created,
        updated,
      });
    } catch (error) {
      results.push({
        source: adapter.source,
        label: adapter.label,
        status: "failed",
        fetched: 0,
        created: 0,
        updated: 0,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
