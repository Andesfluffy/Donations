/**
 * Organisation facts shown across the site.
 *
 * The registration and address fields are legally required on donation
 * solicitations in most jurisdictions (UK Charities Act, US state charitable
 * solicitation registration). They are deliberately left as obvious
 * placeholders rather than plausible-looking invented values — a fake charity
 * number on a live donation page is fraud, not a typo.
 */
/**
 * Absolute origin the site is served from.
 *
 * Resolved through a function rather than `process.env.X ?? fallback` because
 * `??` only rejects null and undefined. A variable that is *defined but empty*
 * — which is what an unfilled project setting on a host gives you — passes
 * straight through it. That empty string reached `new URL("")` and failed the
 * build, and would have done quieter damage had it not: rootless links in the
 * sitemap, and an invalid return URL on the Stripe checkout session.
 *
 * VERCEL_URL covers preview deployments, which have no stable custom domain.
 * It carries no scheme, so one is added. It is server-only, which is fine —
 * nothing client-side imports this module.
 */
function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const preview = process.env.VERCEL_URL?.trim();

  const candidate =
    configured || (preview && `https://${preview}`) || "http://localhost:3000";

  try {
    // Normalised so callers can append paths without doubling the separator.
    return new URL(candidate).href.replace(/\/$/, "");
  } catch {
    // A malformed value is a deployment mistake. Warn rather than throw: this
    // runs during `next build`, and failing the build over it would leave the
    // site down instead of merely mislinked.
    console.warn(
      `[site-config] NEXT_PUBLIC_SITE_URL is not a valid URL (${JSON.stringify(candidate)}) — falling back to localhost. Absolute links and Stripe return URLs will be wrong until it is set.`,
    );
    return "http://localhost:3000";
  }
}

export const siteConfig = {
  name: "Catholic Crisis Relief",
  shortName: "CCR",
  tagline: "Give where it is needed most",
  description:
    "Emergency appeals for communities facing conflict, famine and disaster — with a published ledger showing exactly where every donation went.",

  url: resolveSiteUrl(),

  /** TODO: replace before accepting live donations. */
  legal: {
    entityName: "[REGISTERED ENTITY NAME]",
    registrationNumber: "[CHARITY REGISTRATION NUMBER]",
    registrationAuthority: "[REGISTRATION AUTHORITY]",
    address: ["[STREET ADDRESS]", "[CITY, POSTCODE]", "[COUNTRY]"],
    email: "[CONTACT EMAIL]",
    phone: "[CONTACT PHONE]",
  },

  /**
   * Entity-level disclosures shown in the governance section of /about.
   * Placeholders for the same reason as `legal`: a named board or auditor that
   * does not exist is a more serious lie than a missing one, so these render as
   * "not yet published" until they are real.
   *
   * TODO: replace before accepting live donations.
   */
  governance: {
    trusteeCount: null as number | null,
    auditorName: "[INDEPENDENT AUDITOR]",
    financialYearEnd: "[FINANCIAL YEAR END]",
    annualReportUrl: null as string | null,
  },

  defaultCurrency: "USD",

  /** Suggested one-off amounts, in minor units. */
  suggestedAmounts: [2500, 5000, 10000, 25000, 50000],
  /** Suggested monthly amounts, in minor units. */
  suggestedMonthlyAmounts: [1000, 2500, 5000, 10000],

  /**
   * When each policy was last substantively revised. Donors are entitled to
   * know which version they gave under, so these are shown on the page and
   * must be bumped whenever the wording changes in a way that affects them.
   */
  policyDates: {
    privacy: "2026-09-04",
    donorPrivacy: "2026-09-04",
    refunds: "2026-09-04",
    terms: "2026-09-04",
  },

  /** Processors that handle donor data, disclosed in the privacy policy. */
  processors: [
    { name: "Stripe", purpose: "Card payments and recurring billing", region: "US / EU" },
    { name: "Resend", purpose: "Donation receipts and confirmations", region: "US / EU" },
    { name: "Vercel", purpose: "Website hosting and delivery", region: "Global edge" },
    { name: "Neon", purpose: "Database hosting", region: "EU / US" },
    { name: "Upstash", purpose: "Rate limiting on donation endpoints", region: "Global edge" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * True while the registered entity details are still placeholders.
 *
 * The legal pages use this to show an unmissable draft banner. It disappears
 * on its own once real values are filled in, so the warning cannot be
 * forgotten about and left showing — or worse, removed while the policies are
 * still unreviewed boilerplate.
 */
export function hasPlaceholderLegalDetails(): boolean {
  const { entityName, registrationNumber, email } = siteConfig.legal;
  return [entityName, registrationNumber, email].some((value) => value.startsWith("["));
}
