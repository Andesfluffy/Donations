import { z } from "zod";

import { FeedSource } from "@/generated/prisma";
import type { FeedAdapter, NormalisedFeedItem } from "@/lib/ingest/types";

const BASE_URL = "https://api.reliefweb.int/v2";

/**
 * ReliefWeb — the UN OCHA humanitarian information service.
 *
 * Two things govern this adapter:
 *
 * 1. Since 1 November 2025 the API requires a *pre-approved* appname. An
 *    unapproved one gets a 403, so without RELIEFWEB_APPNAME set we skip the
 *    source rather than hammering an endpoint that will always refuse us.
 *
 * 2. The quota is 1,000 calls a day. That is generous for a cron running a
 *    handful of calls every six hours, and hopeless for fetching per page
 *    view — which is why ingestion writes to our own database and the site
 *    never calls ReliefWeb during a request.
 */

/** The API returns fields as arrays even when logically singular, and omits
 *  them entirely when empty — hence the tolerance here. */
const countrySchema = z.object({
  iso3: z.string().optional(),
  name: z.string().optional(),
});

const disasterSchema = z.object({
  id: z.union([z.string(), z.number()]),
  fields: z.object({
    name: z.string(),
    url: z.string().optional(),
    date: z.object({ created: z.string().optional() }).optional(),
    status: z.string().optional(),
    country: z.array(countrySchema).optional(),
    type: z.array(z.object({ name: z.string().optional() })).optional(),
    description: z.string().optional(),
  }),
});

const responseSchema = z.object({
  data: z.array(disasterSchema).default([]),
});

/**
 * ISO 3166-1 alpha-3 to alpha-2 for the countries our appeals touch.
 *
 * Deliberately partial: an unmapped country yields no code rather than a
 * wrong one, and the item is still stored and reviewable. A full table would
 * be 249 rows of mostly dead weight.
 */
const ISO3_TO_ISO2: Record<string, string> = {
  AFG: "AF", BFA: "BF", BDI: "BI", CAF: "CF", TCD: "TD", COD: "CD", COL: "CO",
  ETH: "ET", HTI: "HT", IRQ: "IQ", KEN: "KE", LBN: "LB", LBY: "LY", MLI: "ML",
  MMR: "MM", MOZ: "MZ", NER: "NE", NGA: "NG", PAK: "PK", PSE: "PS", PHL: "PH",
  SOM: "SO", SSD: "SS", SDN: "SD", SYR: "SY", UKR: "UA", VEN: "VE", YEM: "YE",
  BGD: "BD", NPL: "NP", TUR: "TR", MAR: "MA", AFR: "", ZWE: "ZW", MWI: "MW",
};

function toIso2(iso3: string | undefined): string | null {
  if (!iso3) return null;
  return ISO3_TO_ISO2[iso3.toUpperCase()] || null;
}

export function parseReliefWebResponse(payload: unknown): NormalisedFeedItem[] {
  const parsed = responseSchema.parse(payload);

  return parsed.data.map((entry) => {
    const f = entry.fields;

    return {
      source: FeedSource.RELIEFWEB,
      externalId: String(entry.id),
      title: f.name,
      url: f.url ?? `https://reliefweb.int/disaster/${entry.id}`,
      summary: f.description?.trim() || null,
      imageUrl: null,
      publishedAt: f.date?.created ? new Date(f.date.created) : new Date(),
      countryCodes: (f.country ?? [])
        .map((c) => toIso2(c.iso3))
        .filter((c): c is string => c !== null),
      disasterTypes: (f.type ?? [])
        .map((t) => t.name)
        .filter((n): n is string => Boolean(n)),
    };
  });
}

export const reliefwebAdapter: FeedAdapter = {
  source: FeedSource.RELIEFWEB,
  label: "ReliefWeb",

  async fetchItems(): Promise<NormalisedFeedItem[] | null> {
    const appname = process.env.RELIEFWEB_APPNAME?.trim();

    // Not configured is a skip, not a failure. Requesting an appname is a
    // manual step (a Google Form, reviewed by hand), so a deployment can
    // legitimately run for days without one.
    if (!appname) return null;

    const url = new URL(`${BASE_URL}/disasters`);
    url.searchParams.set("appname", appname);
    url.searchParams.set("limit", "40");
    url.searchParams.set("profile", "list");
    url.searchParams.set("filter[field]", "status");
    url.searchParams.set("filter[value]", "current");
    url.searchParams.set("sort[]", "date.created:desc");

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 403) {
      throw new Error(
        "ReliefWeb rejected the appname (403). It must be pre-approved — request one at https://apidoc.reliefweb.int/parameters#appname",
      );
    }
    if (!response.ok) {
      throw new Error(`ReliefWeb returned ${response.status}`);
    }

    return parseReliefWebResponse(await response.json());
  },
};
