/**
 * Development seed.
 *
 * IMPORTANT: the partners, donations, disbursements and documents created here
 * are FICTIONAL. The crises referenced are real and ongoing, but every
 * organisation name, transfer and receipt below is invented sample data for
 * local development. Nothing in this file may be promoted to a production
 * database — a fabricated ledger is precisely what this project exists to
 * prevent, so the script refuses to run against NODE_ENV=production.
 */

import { randomBytes } from "node:crypto";

import {
  CrisisType,
  DisbursementStatus,
  DocumentType,
  DonationStatus,
  DonationType,
  PartnerType,
  PostStatus,
  PrismaClient,
  Urgency,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed fictional ledger data into production.");
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const USD = "USD";
const publicRef = () => randomBytes(6).toString("base64url");
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

// ---------------------------------------------------------------------------

const CATEGORIES = [
  { slug: "food", name: "Food and nutrition", icon: "wheat", sortOrder: 10 },
  { slug: "water", name: "Clean water and sanitation", icon: "droplets", sortOrder: 20 },
  { slug: "shelter", name: "Shelter and household items", icon: "tent", sortOrder: 30 },
  { slug: "medical", name: "Medical care", icon: "cross", sortOrder: 40 },
  { slug: "protection", name: "Protection and trauma care", icon: "shield", sortOrder: 50 },
  { slug: "education", name: "Education", icon: "book-open", sortOrder: 60 },
  { slug: "pastoral", name: "Pastoral accompaniment", icon: "church", sortOrder: 70 },
  { slug: "logistics", name: "Logistics and transport", icon: "truck", sortOrder: 80 },
  {
    slug: "admin",
    name: "Administration and governance",
    icon: "building",
    sortOrder: 90,
    isOverhead: true,
  },
];

const PARTNERS = [
  {
    slug: "sample-caritas-sudan",
    name: "[SAMPLE] Caritas Sudan Relief Office",
    type: PartnerType.CARITAS_NATIONAL,
    countryCode: "SD",
    countryName: "Sudan",
    description:
      "Fictional sample partner used for local development. Replace with a vetted organisation before publishing.",
  },
  {
    slug: "sample-diocese-goma",
    name: "[SAMPLE] Diocesan Caritas, Goma",
    type: PartnerType.DIOCESE,
    countryCode: "CD",
    countryName: "Democratic Republic of the Congo",
    description: "Fictional sample partner used for local development.",
  },
  {
    slug: "sample-haiti-sisters",
    name: "[SAMPLE] Sisters of Our Lady of Port-au-Prince",
    type: PartnerType.RELIGIOUS_ORDER,
    countryCode: "HT",
    countryName: "Haiti",
    description: "Fictional sample partner used for local development.",
  },
  {
    slug: "sample-sahel-network",
    name: "[SAMPLE] Sahel Parish Network",
    type: PartnerType.PARISH,
    countryCode: "BF",
    countryName: "Burkina Faso",
    description: "Fictional sample partner used for local development.",
  },
];

const CAMPAIGNS = [
  {
    slug: "sudan-displacement-response",
    title: "Food and shelter for families displaced in Sudan",
    summary:
      "Sudan's conflict has forced millions from their homes. Our partner distributes food parcels and household kits to families sheltering in host communities.",
    story:
      "Since fighting escalated, families have moved repeatedly in search of safety, arriving in host communities with nothing. Local parishes have opened halls and schools as shelters.\n\nThis appeal funds monthly food parcels, cooking sets, sleeping mats and clean water treatment for households registered through parish networks. Distribution lists are maintained locally and verified by the diocesan relief office.",
    crisisType: CrisisType.CONFLICT,
    urgency: Urgency.CRITICAL,
    countryCode: "SD",
    countryName: "Sudan",
    region: "East Africa",
    goalCents: 45_000_00,
    partnerSlug: "sample-caritas-sudan",
    featured: true,
    allocations: { food: 40, shelter: 25, water: 15, medical: 10, logistics: 6, admin: 4 },
    startedDaysAgo: 210,
  },
  {
    slug: "eastern-drc-emergency",
    title: "Emergency care for families fleeing eastern Congo",
    summary:
      "Renewed fighting in North Kivu has displaced entire villages. Diocesan teams run clinics and trauma support in camps around Goma.",
    story:
      "Displacement sites around Goma have grown faster than services can follow. The diocesan health team operates mobile clinics and a referral service for women and children.\n\nFunds cover medicines, clinic staffing, water trucking and trauma counselling delivered through parish structures already present in the camps.",
    crisisType: CrisisType.DISPLACEMENT,
    urgency: Urgency.CRITICAL,
    countryCode: "CD",
    countryName: "Democratic Republic of the Congo",
    region: "Central Africa",
    goalCents: 60_000_00,
    partnerSlug: "sample-diocese-goma",
    featured: true,
    allocations: { medical: 35, water: 20, protection: 20, food: 15, admin: 10 },
    startedDaysAgo: 120,
  },
  {
    slug: "haiti-food-security",
    title: "School meals and clean water in Port-au-Prince",
    summary:
      "Gang violence has cut off neighbourhoods from markets and clinics. Sisters running parish schools keep children fed and in class.",
    story:
      "In several neighbourhoods, parish schools are among the few institutions still operating. A daily meal is often the reason a family keeps a child enrolled.\n\nThis appeal funds school meals, water filtration for school buildings, and teacher stipends so classes continue through the crisis.",
    crisisType: CrisisType.CONFLICT,
    urgency: Urgency.HIGH,
    countryCode: "HT",
    countryName: "Haiti",
    region: "Caribbean",
    goalCents: 28_000_00,
    partnerSlug: "sample-haiti-sisters",
    allocations: { food: 45, education: 25, water: 15, pastoral: 8, admin: 7 },
    startedDaysAgo: 95,
  },
  {
    slug: "sahel-drought-response",
    title: "Water and livestock support across the Sahel",
    summary:
      "Successive failed rains have emptied wells and thinned herds. Parish networks are repairing boreholes and running feed programmes.",
    story:
      "Communities across the region depend on shallow wells that no longer reach water. Herders have lost animals that represent a family's entire savings.\n\nFunds repair and deepen boreholes, supply animal feed through the dry season, and support seed distribution before the next planting.",
    crisisType: CrisisType.DROUGHT,
    urgency: Urgency.HIGH,
    countryCode: "BF",
    countryName: "Burkina Faso",
    region: "Sahel",
    goalCents: 32_000_00,
    partnerSlug: "sample-sahel-network",
    allocations: { water: 50, food: 25, logistics: 15, admin: 10 },
    startedDaysAgo: 60,
  },
  {
    slug: "winter-shelter-appeal",
    title: "Winter shelter for displaced families",
    summary:
      "Families in unheated collective shelters face a second winter without adequate fuel, bedding or window repairs.",
    story:
      "Collective shelters were built for summer occupancy. As temperatures drop, families burn whatever they can find, and respiratory illness rises sharply among children.\n\nThis appeal funds insulation, stoves and fuel vouchers, thermal blankets, and repairs to windows and roofing before the first frost.",
    crisisType: CrisisType.DISPLACEMENT,
    urgency: Urgency.NORMAL,
    countryCode: "SY",
    countryName: "Syria",
    region: "Middle East",
    goalCents: 22_000_00,
    partnerSlug: "sample-caritas-sudan",
    allocations: { shelter: 55, medical: 15, food: 15, logistics: 8, admin: 7 },
    startedDaysAgo: 30,
  },
];

const POSTS = [
  {
    slug: "first-distribution-reaches-host-communities",
    title: "First distribution reaches 1,200 households in host communities",
    excerpt:
      "Sample field report. Parcels covering a month of staples reached families sheltering with relatives outside the town.",
    campaignSlug: "sudan-displacement-response",
    daysAgo: 12,
  },
  {
    slug: "mobile-clinic-resumes-in-displacement-sites",
    title: "Mobile clinic resumes weekly rounds in displacement sites",
    excerpt:
      "Sample field report. After a three-week pause, the diocesan health team restarted consultations at four sites.",
    campaignSlug: "eastern-drc-emergency",
    daysAgo: 21,
  },
  {
    slug: "school-meals-keep-attendance-steady",
    title: "School meals keep attendance steady through a difficult term",
    excerpt:
      "Sample field report. Enrolment held even as families in surrounding neighbourhoods were displaced again.",
    campaignSlug: "haiti-food-security",
    daysAgo: 34,
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding development data (fictional partners and ledger)…");

  // Clear in FK-safe order so reseeding is idempotent.
  await db.disbursementDocument.deleteMany();
  await db.impactMetric.deleteMany();
  await db.disbursement.deleteMany();
  await db.donation.deleteMany();
  await db.donor.deleteMany();
  await db.campaignFinancials.deleteMany();
  await db.campaignAllocation.deleteMany();
  await db.crisisFeedItem.deleteMany();
  await db.prayerIntention.deleteMany();
  await db.newsPost.deleteMany();
  await db.campaign.deleteMany();
  await db.partner.deleteMany();
  await db.allocationCategory.deleteMany();

  const categories = new Map<string, string>();
  for (const category of CATEGORIES) {
    const created = await db.allocationCategory.create({ data: category });
    categories.set(created.slug, created.id);
  }

  const partners = new Map<string, string>();
  for (const partner of PARTNERS) {
    const created = await db.partner.create({
      data: { ...partner, vettedAt: daysAgo(400), vettingNotes: "Sample data — not a real vetting record." },
    });
    partners.set(created.slug, created.id);
  }

  for (const spec of CAMPAIGNS) {
    const campaign = await db.campaign.create({
      data: {
        slug: spec.slug,
        title: spec.title,
        summary: spec.summary,
        story: spec.story,
        status: "ACTIVE",
        urgency: spec.urgency,
        crisisType: spec.crisisType,
        featured: spec.featured ?? false,
        countryCode: spec.countryCode,
        countryName: spec.countryName,
        region: spec.region,
        goalCents: spec.goalCents,
        currency: USD,
        partnerId: partners.get(spec.partnerSlug)!,
        startedAt: daysAgo(spec.startedDaysAgo),
        allocations: {
          create: Object.entries(spec.allocations).map(([slug, plannedPercent]) => ({
            categoryId: categories.get(slug)!,
            plannedPercent,
          })),
        },
      },
    });

    // Donations: enough spread to make the ledger legible, weighted so no
    // campaign lands exactly on its goal.
    const donationCount = 18 + Math.floor(Math.random() * 25);
    const targetRaised = Math.round(spec.goalCents * (0.28 + Math.random() * 0.5));
    let remaining = targetRaised;

    for (let i = 0; i < donationCount; i++) {
      const isLast = i === donationCount - 1;
      const amountCents = isLast
        ? Math.max(1000, remaining)
        : Math.max(1000, Math.round((remaining / (donationCount - i)) * (0.5 + Math.random())));
      remaining -= amountCents;

      const feeCents = Math.round(amountCents * 0.029) + 30;
      const recurring = Math.random() < 0.25;

      const donor = await db.donor.create({
        data: {
          email: `sample.donor.${campaign.slug}.${i}@example.invalid`,
          name: `Sample Donor ${i + 1}`,
          taxCountry: "US",
        },
      });

      await db.donation.create({
        data: {
          donorId: donor.id,
          campaignId: campaign.id,
          amountCents,
          feeCents,
          netCents: amountCents - feeCents,
          currency: USD,
          type: recurring ? DonationType.RECURRING : DonationType.ONE_TIME,
          status: DonationStatus.SUCCEEDED,
          publicRef: publicRef(),
          isAnonymous: Math.random() < 0.3,
          createdAt: daysAgo(Math.floor(Math.random() * spec.startedDaysAgo)),
        },
      });
    }

    // Disbursements: roughly 60% of income sent out, split along the plan so
    // the plan-versus-actual comparison shows realistic drift.
    const raised = await db.donation.aggregate({
      where: { campaignId: campaign.id, status: DonationStatus.SUCCEEDED },
      _sum: { netCents: true },
    });
    const toDisburse = Math.round((raised._sum.netCents ?? 0) * 0.6);

    let n = 0;
    for (const [slug, plannedPercent] of Object.entries(spec.allocations)) {
      // Drift the actual split away from the plan by ±20% so the comparison
      // is not suspiciously perfect.
      const drift = 0.8 + Math.random() * 0.4;
      const amountCents = Math.round((toDisburse * plannedPercent * drift) / 100);
      if (amountCents < 500) continue;

      const disbursement = await db.disbursement.create({
        data: {
          campaignId: campaign.id,
          partnerId: partners.get(spec.partnerSlug)!,
          categoryId: categories.get(slug)!,
          amountCents,
          currency: USD,
          status: n === 0 ? DisbursementStatus.REPORTED : DisbursementStatus.CONFIRMED,
          reference: `SAMPLE-${campaign.slug.toUpperCase().slice(0, 6)}-${1000 + n}`,
          description: `Sample transfer for ${CATEGORIES.find((c) => c.slug === slug)?.name.toLowerCase()}.`,
          disbursedAt: daysAgo(Math.floor(Math.random() * (spec.startedDaysAgo - 5)) + 5),
        },
      });

      await db.disbursementDocument.create({
        data: {
          disbursementId: disbursement.id,
          type: n === 0 ? DocumentType.FIELD_REPORT : DocumentType.RECEIPT,
          title: n === 0 ? "Sample field report (placeholder)" : "Sample receipt (placeholder)",
          // Deliberately a dead placeholder path: a seeded document must never
          // look like a real, downloadable financial record.
          fileUrl: "/placeholder/sample-document.pdf",
          mimeType: "application/pdf",
        },
      });

      n++;
    }

    await db.impactMetric.create({
      data: {
        campaignId: campaign.id,
        label: "Households reached",
        value: 200 + Math.floor(Math.random() * 2400),
        unit: "households",
        verifiedAt: daysAgo(14),
      },
    });

    console.log(`  · ${campaign.slug}`);
  }

  for (const post of POSTS) {
    const campaign = await db.campaign.findUnique({ where: { slug: post.campaignSlug } });
    await db.newsPost.create({
      data: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body:
          "This is placeholder sample content for local development. Replace with a real field report before publishing.",
        status: PostStatus.PUBLISHED,
        publishedAt: daysAgo(post.daysAgo),
        campaignId: campaign?.id,
      },
    });
  }

  // Financials are derived, never seeded directly — this proves the cache is
  // reproducible from source rows.
  const { recomputeCampaignFinancials } = await import("../src/lib/finance");
  for (const spec of CAMPAIGNS) {
    const campaign = await db.campaign.findUnique({ where: { slug: spec.slug } });
    if (campaign) await recomputeCampaignFinancials(campaign.id);
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
