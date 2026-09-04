import type { FeedSource } from "@/generated/prisma";

/**
 * The normalised shape every adapter returns.
 *
 * Adapters do the source-specific parsing and nothing else — no database
 * access, no HTML rendering — so each one can be tested against a captured
 * fixture with no network and no schema.
 */
export interface NormalisedFeedItem {
  source: FeedSource;
  /** Stable id from the source. Used with `source` as the upsert key, so it
   *  must not change between fetches for the same article. */
  externalId: string;
  title: string;
  url: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  /** ISO 3166-1 alpha-2, uppercase. Empty when the source does not say. */
  countryCodes: string[];
  /** Free-text hazard or category labels from the source. */
  disasterTypes: string[];
}

export interface FeedAdapter {
  source: FeedSource;
  label: string;
  /**
   * Returns null when the adapter is not configured — a missing API key is a
   * skipped source, not a failed run.
   */
  fetchItems(): Promise<NormalisedFeedItem[] | null>;
}

export interface IngestResult {
  source: FeedSource;
  label: string;
  status: "ok" | "skipped" | "failed";
  fetched: number;
  created: number;
  updated: number;
  message?: string;
}
