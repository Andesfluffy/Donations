import { FeedSource } from "@/generated/prisma";
import type { FeedAdapter, NormalisedFeedItem } from "@/lib/ingest/types";
import { parseFeedDate, parseRss, stripHtml } from "@/lib/ingest/rss";

const FEED_URL = "https://www.vaticannews.va/en.rss.xml";

/**
 * Vatican News, English edition. No authentication, no rate limit published.
 *
 * The feed carries the whole Church news cycle, most of which is not
 * humanitarian. Filtering happens in the editorial review queue rather than
 * here — an adapter that silently drops items on a keyword guess would hide
 * things an editor should decide about.
 */
export const vaticanNewsAdapter: FeedAdapter = {
  source: FeedSource.VATICAN_NEWS,
  label: "Vatican News",

  async fetchItems(): Promise<NormalisedFeedItem[]> {
    const response = await fetch(FEED_URL, {
      headers: { accept: "application/rss+xml, application/xml" },
      // Ingestion runs on a cron; a stale cached feed would defeat the point.
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Vatican News feed returned ${response.status}`);
    }

    return parseRss(await response.text()).map((item) => ({
      source: FeedSource.VATICAN_NEWS,
      externalId: item.guid,
      title: item.title,
      url: item.link,
      summary: item.description ? stripHtml(item.description) : null,
      imageUrl: item.imageUrl,
      publishedAt: parseFeedDate(item.pubDate),
      countryCodes: [],
      disasterTypes: item.categories,
    }));
  },
};
