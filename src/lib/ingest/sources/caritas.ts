import { FeedSource } from "@/generated/prisma";
import type { FeedAdapter, NormalisedFeedItem } from "@/lib/ingest/types";
import { parseFeedDate, parseRss, stripHtml } from "@/lib/ingest/rss";

const FEED_URL = "https://www.caritas.org/feed/";

/**
 * Caritas Internationalis. A WordPress feed at the conventional /feed/ path —
 * confirmed live rather than assumed, since Caritas publishes no API docs.
 *
 * WordPress appends its own tracking parameters to every link and closes each
 * description with a "The post … appeared first on Caritas" boilerplate line.
 * Both are stripped so the stored item is the article, not the CMS's framing.
 */
const WORDPRESS_BOILERPLATE = /The post .*? appeared first on .*?\.?\s*$/i;

function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const caritasAdapter: FeedAdapter = {
  source: FeedSource.CARITAS,
  label: "Caritas Internationalis",

  async fetchItems(): Promise<NormalisedFeedItem[]> {
    const response = await fetch(FEED_URL, {
      headers: { accept: "application/rss+xml, application/xml" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Caritas feed returned ${response.status}`);
    }

    return parseRss(await response.text()).map((item) => ({
      source: FeedSource.CARITAS,
      externalId: item.guid,
      title: item.title,
      url: cleanUrl(item.link),
      summary: item.description
        ? stripHtml(item.description).replace(WORDPRESS_BOILERPLATE, "").trim() || null
        : null,
      imageUrl: item.imageUrl,
      publishedAt: parseFeedDate(item.pubDate),
      countryCodes: [],
      // "article" is a WordPress post-type tag, not a topic; drop it.
      disasterTypes: item.categories.filter((c) => c.toLowerCase() !== "article"),
    }));
  },
};
