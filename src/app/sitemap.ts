import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";

/** Built per request rather than at build time: appeals open and close, and a
 *  sitemap frozen at deploy would advertise closed appeals and miss new ones. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");

  const [campaigns, posts, partners] = await Promise.all([
    db.campaign.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    db.newsPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    db.partner.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/appeals`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/crises`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/news`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/transparency`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/transparency/ledger`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/partners`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/give`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/donor-privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/refunds`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...campaigns.map((campaign) => ({
      url: `${base}/appeals/${campaign.slug}`,
      lastModified: campaign.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/news/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...partners.map((partner) => ({
      url: `${base}/partners/${partner.slug}`,
      lastModified: partner.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
