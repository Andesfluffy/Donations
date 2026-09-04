import { XMLParser } from "fast-xml-parser";

/**
 * Minimal RSS 2.0 parsing shared by the Vatican News and Caritas adapters.
 *
 * Deliberately tolerant: these are third-party feeds we do not control, and a
 * single malformed item should cost us that item, not the whole run.
 */

export interface RawRssItem {
  title: string;
  link: string;
  guid: string;
  description: string | null;
  pubDate: string | null;
  categories: string[];
  imageUrl: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // CDATA and entity handling: feeds mix both, and titles routinely contain
  // curly quotes encoded as entities.
  processEntities: true,
  trimValues: true,
});

/** Coerce a value that may be a string, an object with #text, or absent. */
function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return text((value as Record<string, unknown>)["#text"]);
  }
  return null;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Strip tags and collapse whitespace, for turning an HTML description into a
 *  plain-text summary. */
export function stripHtml(html: string, maxLength = 400): string {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#8217;|&#8216;/g, "’")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  // Cut on a word boundary so the summary does not end mid-word.
  return `${plain.slice(0, plain.lastIndexOf(" ", maxLength))}…`;
}

/** First image referenced by the item, from any of the usual carriers. */
function extractImage(item: Record<string, unknown>): string | null {
  const media = asArray(item["media:content"] as Record<string, unknown>[])[0];
  const mediaUrl = media?.["@_url"];
  if (typeof mediaUrl === "string") return mediaUrl;

  const thumb = asArray(item["media:thumbnail"] as Record<string, unknown>[])[0];
  const thumbUrl = thumb?.["@_url"];
  if (typeof thumbUrl === "string") return thumbUrl;

  const enclosure = asArray(item.enclosure as Record<string, unknown>[])[0];
  const enclosureUrl = enclosure?.["@_url"];
  const enclosureType = enclosure?.["@_type"];
  if (
    typeof enclosureUrl === "string" &&
    (typeof enclosureType !== "string" || enclosureType.startsWith("image/"))
  ) {
    return enclosureUrl;
  }

  // Last resort: the first <img> inside the description HTML.
  const description = text(item.description);
  const match = description?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export function parseRss(xml: string): RawRssItem[] {
  const parsed = parser.parse(xml) as Record<string, never>;
  const channel = (parsed?.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;

  if (!channel) return [];

  return asArray(channel.item as Record<string, unknown>[])
    .map((item): RawRssItem | null => {
      const title = text(item.title);
      const link = text(item.link);
      if (!title || !link) return null;

      // guid is preferred as the stable id, but many feeds omit it or make it
      // a permalink; the link is a reasonable fallback.
      const guid = text(item.guid) ?? link;

      return {
        title,
        link,
        guid,
        description: text(item.description),
        pubDate: text(item.pubDate),
        categories: asArray(item.category as unknown[])
          .map((c) => text(c))
          .filter((c): c is string => c !== null),
        imageUrl: extractImage(item),
      };
    })
    .filter((item): item is RawRssItem => item !== null);
}

/** RFC 822 dates from feeds, falling back to now rather than throwing. */
export function parseFeedDate(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
