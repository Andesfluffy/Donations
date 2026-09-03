/**
 * Organisation facts shown across the site.
 *
 * The registration and address fields are legally required on donation
 * solicitations in most jurisdictions (UK Charities Act, US state charitable
 * solicitation registration). They are deliberately left as obvious
 * placeholders rather than plausible-looking invented values — a fake charity
 * number on a live donation page is fraud, not a typo.
 */
export const siteConfig = {
  name: "Catholic Crisis Relief",
  shortName: "CCR",
  tagline: "Give where it is needed most",
  description:
    "Emergency appeals for communities facing conflict, famine and disaster — with a published ledger showing exactly where every donation went.",

  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** TODO: replace before accepting live donations. */
  legal: {
    entityName: "[REGISTERED ENTITY NAME]",
    registrationNumber: "[CHARITY REGISTRATION NUMBER]",
    registrationAuthority: "[REGISTRATION AUTHORITY]",
    address: ["[STREET ADDRESS]", "[CITY, POSTCODE]", "[COUNTRY]"],
    email: "[CONTACT EMAIL]",
    phone: "[CONTACT PHONE]",
  },

  defaultCurrency: "USD",

  /** Suggested one-off amounts, in minor units. */
  suggestedAmounts: [2500, 5000, 10000, 25000, 50000],
  /** Suggested monthly amounts, in minor units. */
  suggestedMonthlyAmounts: [1000, 2500, 5000, 10000],
} as const;

export type SiteConfig = typeof siteConfig;
