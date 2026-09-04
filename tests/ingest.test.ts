import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseFeedDate, parseRss, stripHtml } from "@/lib/ingest/rss";
import { parseReliefWebResponse } from "@/lib/ingest/sources/reliefweb";

/**
 * Adapters are tested against captured fixtures, never the live network: a
 * feed outage must not turn into a red build, and a feed changing shape should
 * fail loudly here rather than silently in production.
 */
const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "tests/fixtures", name), "utf8");

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>there</b></p>")).toBe("Hello there");
  });

  it("decodes the entities these feeds actually emit", () => {
    expect(stripHtml("&#8220;Mud is everywhere&#8221;")).toBe('"Mud is everywhere"');
    expect(stripHtml("it&#8217;s")).toBe("it’s");
    expect(stripHtml("a &amp; b")).toBe("a & b");
  });

  it("truncates on a word boundary rather than mid-word", () => {
    const long = `${"word ".repeat(200)}end`;
    const summary = stripHtml(long, 50);
    expect(summary.length).toBeLessThanOrEqual(51);
    expect(summary.endsWith("…")).toBe(true);
    expect(summary).not.toMatch(/wor…$/);
  });

  it("drops script and style content entirely", () => {
    expect(stripHtml("<script>alert(1)</script>Real text")).toBe("Real text");
    expect(stripHtml("<style>.a{color:red}</style>Real text")).toBe("Real text");
  });
});

describe("parseFeedDate", () => {
  it("parses RFC 822 dates from real feeds", () => {
    expect(parseFeedDate("Thu, 03 Sep 2026 10:07:02 +0000").toISOString()).toBe(
      "2026-09-03T10:07:02.000Z",
    );
  });

  it("falls back to now rather than throwing on rubbish", () => {
    expect(parseFeedDate("not a date")).toBeInstanceOf(Date);
    expect(Number.isNaN(parseFeedDate("not a date").getTime())).toBe(false);
    expect(Number.isNaN(parseFeedDate(null).getTime())).toBe(false);
  });
});

describe("Vatican News feed", () => {
  const items = parseRss(fixture("vatican-news.rss.xml"));

  it("parses every item in the captured feed", () => {
    expect(items.length).toBeGreaterThan(10);
  });

  it("gives every item a title, link and stable id", () => {
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.link).toMatch(/^https?:\/\//);
      expect(item.guid.length).toBeGreaterThan(0);
    }
  });

  it("resolves CDATA titles rather than leaving the wrapper in", () => {
    expect(items.some((i) => i.title.includes("CDATA"))).toBe(false);
  });

  it("produces unique ids, so upserts cannot collapse distinct articles", () => {
    const ids = items.map((i) => i.guid);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Caritas feed", () => {
  const items = parseRss(fixture("caritas.rss.xml"));

  it("parses the captured feed", () => {
    expect(items.length).toBeGreaterThan(5);
  });

  it("reads categories, which carry the topic", () => {
    expect(items.some((i) => i.categories.length > 0)).toBe(true);
  });

  it("finds a publication date on every item", () => {
    for (const item of items) {
      expect(item.pubDate).toBeTruthy();
      expect(Number.isNaN(parseFeedDate(item.pubDate).getTime())).toBe(false);
    }
  });
});

describe("parseRss resilience", () => {
  it("returns nothing for a non-feed rather than throwing", () => {
    expect(parseRss("<html><body>not a feed</body></html>")).toEqual([]);
    expect(parseRss("")).toEqual([]);
  });

  it("skips an item missing a title or link, keeping the rest", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Keep me</title><link>https://example.org/a</link></item>
      <item><title>No link</title></item>
      <item><link>https://example.org/c</link></item>
    </channel></rss>`;

    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Keep me");
  });

  it("handles a channel with exactly one item, which parsers often return unwrapped", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Only one</title><link>https://example.org/a</link></item>
    </channel></rss>`;

    expect(parseRss(xml)).toHaveLength(1);
  });
});

describe("ReliefWeb response parsing", () => {
  // Shape taken from the documented API; the live endpoint requires a
  // pre-approved appname, so this cannot be captured from a real call yet.
  const payload = {
    data: [
      {
        id: 52816,
        fields: {
          name: "Sudan: Complex Emergency",
          url: "https://reliefweb.int/disaster/ce-2023-000123-sdn",
          status: "current",
          date: { created: "2026-08-01T00:00:00+00:00" },
          country: [{ iso3: "SDN", name: "Sudan" }, { iso3: "TCD", name: "Chad" }],
          type: [{ name: "Complex Emergency" }],
          description: "Ongoing conflict has displaced millions.",
        },
      },
    ],
  };

  it("normalises a disaster record", () => {
    const [item] = parseReliefWebResponse(payload);

    expect(item.externalId).toBe("52816");
    expect(item.title).toBe("Sudan: Complex Emergency");
    expect(item.countryCodes).toEqual(["SD", "TD"]);
    expect(item.disasterTypes).toEqual(["Complex Emergency"]);
    expect(item.publishedAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("tolerates the optional fields the API omits when empty", () => {
    const [item] = parseReliefWebResponse({
      data: [{ id: "1", fields: { name: "Bare minimum" } }],
    });

    expect(item.title).toBe("Bare minimum");
    expect(item.countryCodes).toEqual([]);
    expect(item.disasterTypes).toEqual([]);
    expect(item.url).toContain("reliefweb.int");
  });

  it("omits an unmapped country rather than inventing a code", () => {
    const [item] = parseReliefWebResponse({
      data: [{ id: "2", fields: { name: "X", country: [{ iso3: "ZZZ" }] } }],
    });

    expect(item.countryCodes).toEqual([]);
  });

  it("rejects a payload that is not the expected shape", () => {
    expect(() => parseReliefWebResponse({ data: [{ nope: true }] })).toThrow();
  });
});
