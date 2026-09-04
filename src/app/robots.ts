import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Receipts are addressed by reference and belong to one donor; the
      // post-checkout pages are personal too, and none of the three are worth
      // indexing. `/api/` is excluded because a crawled webhook or checkout
      // endpoint is noise at best.
      disallow: ["/api/", "/give/receipt/", "/give/thanks"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
