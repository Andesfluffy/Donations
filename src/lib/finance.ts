import { db } from "@/lib/db";
import { DisbursementStatus, DonationStatus } from "@/generated/prisma";

/**
 * The single source of every currency figure the site displays.
 *
 * The rule this module exists to enforce: no page, component, CMS field or
 * admin text box may state how much was raised or spent. Those numbers are
 * derived here from Donation and Disbursement rows, so the site physically
 * cannot claim something the ledger does not support.
 *
 * If you find yourself wanting a "total raised" string from anywhere else,
 * that is the bug.
 */

/** Money is out the door from SENT onward; PLANNED is committed, not spent. */
const SPENT: DisbursementStatus[] = [
  DisbursementStatus.SENT,
  DisbursementStatus.CONFIRMED,
  DisbursementStatus.REPORTED,
];

export interface Financials {
  /** Sum of donation.netCents — what actually reached the fund after fees. */
  raisedCents: number;
  /** Sum of disbursement.amountCents for rows at SENT or beyond. */
  disbursedCents: number;
  /** Disbursed to categories flagged isOverhead. */
  overheadCents: number;
  /**
   * Received but not yet disbursed. Can legitimately go negative when a
   * campaign is front-funded from the general fund; we surface the real
   * signed value rather than clamping it to zero.
   */
  inTransitCents: number;
  /** Overhead as a share of money spent, 0–1. Null when nothing is spent yet. */
  overheadRatio: number | null;
  /** Share of raised funds already delivered, 0–1. Null before any income. */
  disbursedRatio: number | null;
  donationCount: number;
  recurringCount: number;
}

function derive(
  raisedCents: number,
  disbursedCents: number,
  overheadCents: number,
  donationCount: number,
  recurringCount: number,
): Financials {
  return {
    raisedCents,
    disbursedCents,
    overheadCents,
    inTransitCents: raisedCents - disbursedCents,
    overheadRatio: disbursedCents > 0 ? overheadCents / disbursedCents : null,
    disbursedRatio: raisedCents > 0 ? disbursedCents / raisedCents : null,
    donationCount,
    recurringCount,
  };
}

/** Financials for one appeal, computed live from source rows. */
export async function getCampaignFinancials(campaignId: string): Promise<Financials> {
  const [donations, recurring, disbursed, overhead] = await Promise.all([
    db.donation.aggregate({
      where: { campaignId, status: DonationStatus.SUCCEEDED },
      _sum: { netCents: true },
      _count: true,
    }),
    db.donation.count({
      where: { campaignId, status: DonationStatus.SUCCEEDED, type: "RECURRING" },
    }),
    db.disbursement.aggregate({
      where: { campaignId, status: { in: SPENT } },
      _sum: { amountCents: true },
    }),
    db.disbursement.aggregate({
      where: { campaignId, status: { in: SPENT }, category: { isOverhead: true } },
      _sum: { amountCents: true },
    }),
  ]);

  return derive(
    donations._sum.netCents ?? 0,
    disbursed._sum.amountCents ?? 0,
    overhead._sum.amountCents ?? 0,
    donations._count,
    recurring,
  );
}

/** Organisation-wide totals for /transparency. */
export async function getOrgFinancials(): Promise<Financials> {
  const [donations, recurring, disbursed, overhead] = await Promise.all([
    db.donation.aggregate({
      where: { status: DonationStatus.SUCCEEDED },
      _sum: { netCents: true },
      _count: true,
    }),
    db.donation.count({
      where: { status: DonationStatus.SUCCEEDED, type: "RECURRING" },
    }),
    db.disbursement.aggregate({
      where: { status: { in: SPENT } },
      _sum: { amountCents: true },
    }),
    db.disbursement.aggregate({
      where: { status: { in: SPENT }, category: { isOverhead: true } },
      _sum: { amountCents: true },
    }),
  ]);

  return derive(
    donations._sum.netCents ?? 0,
    disbursed._sum.amountCents ?? 0,
    overhead._sum.amountCents ?? 0,
    donations._count,
    recurring,
  );
}

export interface CategoryBreakdown {
  categoryId: string;
  slug: string;
  name: string;
  icon: string | null;
  isOverhead: boolean;
  /** What we said we would spend here, from CampaignAllocation. */
  plannedPercent: number | null;
  /** What we have actually spent here. */
  actualCents: number;
  actualPercent: number;
}

/**
 * Plan versus delivery, per category. Returns every category that was either
 * planned for or spent against — a category we promised and then never funded
 * must still appear, showing zero, or the comparison is dishonest.
 */
export async function getCampaignBreakdown(campaignId: string): Promise<CategoryBreakdown[]> {
  const [allocations, spend] = await Promise.all([
    db.campaignAllocation.findMany({
      where: { campaignId },
      include: { category: true },
    }),
    db.disbursement.groupBy({
      by: ["categoryId"],
      where: { campaignId, status: { in: SPENT } },
      _sum: { amountCents: true },
    }),
  ]);

  const spendByCategory = new Map(
    spend.map((row) => [row.categoryId, row._sum.amountCents ?? 0]),
  );
  const totalSpend = [...spendByCategory.values()].reduce((a, b) => a + b, 0);

  const categoryIds = new Set<string>([
    ...allocations.map((a) => a.categoryId),
    ...spendByCategory.keys(),
  ]);

  // Categories that were spent against but never planned for still need their
  // display metadata.
  const categories = await db.allocationCategory.findMany({
    where: { id: { in: [...categoryIds] } },
    orderBy: { sortOrder: "asc" },
  });

  const plannedByCategory = new Map(
    allocations.map((a) => [a.categoryId, a.plannedPercent]),
  );

  return categories.map((category) => {
    const actualCents = spendByCategory.get(category.id) ?? 0;
    return {
      categoryId: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      isOverhead: category.isOverhead,
      plannedPercent: plannedByCategory.get(category.id) ?? null,
      actualCents,
      actualPercent: totalSpend > 0 ? (actualCents / totalSpend) * 100 : 0,
    };
  });
}

/**
 * Refresh the cached aggregate for a campaign. Called after any donation or
 * disbursement write. The cache is strictly derived — dropping the table and
 * rerunning this for every campaign must reproduce it exactly.
 */
export async function recomputeCampaignFinancials(campaignId: string): Promise<void> {
  const f = await getCampaignFinancials(campaignId);

  const data = {
    raisedCents: BigInt(f.raisedCents),
    disbursedCents: BigInt(f.disbursedCents),
    overheadCents: BigInt(f.overheadCents),
    donationCount: f.donationCount,
    recurringCount: f.recurringCount,
    recomputedAt: new Date(),
  };

  await db.campaignFinancials.upsert({
    where: { campaignId },
    create: { campaignId, ...data },
    update: data,
  });
}

// ---------------------------------------------------------------------------
// Organisation-wide views, used by /transparency
// ---------------------------------------------------------------------------

/**
 * Spend by category across every appeal. Unlike the per-campaign breakdown
 * there is no single plan to compare against, so this reports actuals only.
 */
export async function getOrgBreakdown(): Promise<CategoryBreakdown[]> {
  const spend = await db.disbursement.groupBy({
    by: ["categoryId"],
    where: { status: { in: SPENT } },
    _sum: { amountCents: true },
  });

  const spendByCategory = new Map(
    spend.map((row) => [row.categoryId, row._sum.amountCents ?? 0]),
  );
  const total = [...spendByCategory.values()].reduce((a, b) => a + b, 0);

  const categories = await db.allocationCategory.findMany({
    where: { id: { in: [...spendByCategory.keys()] } },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((category) => {
    const actualCents = spendByCategory.get(category.id) ?? 0;
    return {
      categoryId: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      isOverhead: category.isOverhead,
      plannedPercent: null,
      actualCents,
      actualPercent: total > 0 ? (actualCents / total) * 100 : 0,
    };
  });
}

export interface LedgerFilters {
  campaignSlug?: string;
  partnerSlug?: string;
  categorySlug?: string;
  /** Free-text over description, reference and partner name. */
  query?: string;
}

export interface LedgerEntry {
  id: string;
  disbursedAt: Date;
  amountCents: number;
  currency: string;
  description: string;
  reference: string | null;
  status: (typeof SPENT)[number] | DisbursementStatus;
  correctsId: string | null;
  campaignTitle: string;
  campaignSlug: string;
  categoryName: string;
  partnerName: string;
  partnerSlug: string;
  documents: { id: string; type: string; title: string; fileUrl: string }[];
}

function ledgerWhere(filters: LedgerFilters) {
  const query = filters.query?.trim();

  return {
    ...(filters.campaignSlug ? { campaign: { slug: filters.campaignSlug } } : {}),
    ...(filters.partnerSlug ? { partner: { slug: filters.partnerSlug } } : {}),
    ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: "insensitive" as const } },
            { reference: { contains: query, mode: "insensitive" as const } },
            { partner: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}

/**
 * The public ledger across every appeal.
 *
 * PLANNED rows are included here, unlike in the spend totals: a commitment
 * that has not yet moved is information a donor is entitled to see, as long as
 * its status says so plainly.
 */
export async function getLedgerEntries(
  filters: LedgerFilters = {},
  { skip = 0, take = 50 }: { skip?: number; take?: number } = {},
): Promise<{ entries: LedgerEntry[]; total: number; totalCents: number }> {
  const where = ledgerWhere(filters);

  const [rows, total, sum] = await Promise.all([
    db.disbursement.findMany({
      where,
      orderBy: { disbursedAt: "desc" },
      skip,
      take,
      include: {
        campaign: { select: { title: true, slug: true } },
        partner: { select: { name: true, slug: true } },
        category: { select: { name: true } },
        documents: { select: { id: true, type: true, title: true, fileUrl: true } },
      },
    }),
    db.disbursement.count({ where }),
    db.disbursement.aggregate({ where, _sum: { amountCents: true } }),
  ]);

  return {
    entries: rows.map((row) => ({
      id: row.id,
      disbursedAt: row.disbursedAt,
      amountCents: row.amountCents,
      currency: row.currency,
      description: row.description,
      reference: row.reference,
      status: row.status,
      correctsId: row.correctsId,
      campaignTitle: row.campaign.title,
      campaignSlug: row.campaign.slug,
      categoryName: row.category.name,
      partnerName: row.partner.name,
      partnerSlug: row.partner.slug,
      documents: row.documents,
    })),
    total,
    totalCents: sum._sum.amountCents ?? 0,
  };
}

export interface MonthlyFlow {
  /** First day of the month, UTC. */
  month: Date;
  raisedCents: number;
  disbursedCents: number;
}

/**
 * Money in against money out, by month. Shows whether funds are actually
 * moving or accumulating — the question a pie chart of categories cannot
 * answer.
 */
export async function getMonthlyFlow(months = 12): Promise<MonthlyFlow[]> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - (months - 1), 1);
  since.setUTCHours(0, 0, 0, 0);

  const [raised, disbursed] = await Promise.all([
    db.$queryRaw<{ month: Date; total: bigint }[]>`
      SELECT date_trunc('month', "createdAt") AS month,
             COALESCE(SUM("netCents"), 0)::bigint AS total
      FROM "Donation"
      WHERE status = 'SUCCEEDED' AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ month: Date; total: bigint }[]>`
      SELECT date_trunc('month', "disbursedAt") AS month,
             COALESCE(SUM("amountCents"), 0)::bigint AS total
      FROM "Disbursement"
      WHERE status IN ('SENT', 'CONFIRMED', 'REPORTED') AND "disbursedAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
  ]);

  const key = (d: Date) => d.toISOString().slice(0, 7);
  const raisedByMonth = new Map(raised.map((r) => [key(r.month), Number(r.total)]));
  const disbursedByMonth = new Map(disbursed.map((r) => [key(r.month), Number(r.total)]));

  // Emit every month in range, including empty ones, so the series has no gaps.
  const series: MonthlyFlow[] = [];
  for (let i = 0; i < months; i++) {
    const month = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    series.push({
      month,
      raisedCents: raisedByMonth.get(key(month)) ?? 0,
      disbursedCents: disbursedByMonth.get(key(month)) ?? 0,
    });
  }

  return series;
}

export interface PartnerFinancials {
  /** Total sent to this partner, across every appeal. */
  receivedCents: number;
  /** Transfers at SENT or beyond. */
  transferCount: number;
  /** Distinct appeals this partner has delivered. */
  campaignCount: number;
  /** Supporting documents filed against their transfers. */
  documentCount: number;
}

/**
 * What one partner has actually received from us.
 *
 * Publishing this per-partner is the point of naming them at all: a reader can
 * see not just who delivers the work but how much we have entrusted to each.
 */
export async function getPartnerFinancials(partnerId: string): Promise<PartnerFinancials> {
  const [transfers, campaigns, documents] = await Promise.all([
    db.disbursement.aggregate({
      where: { partnerId, status: { in: SPENT } },
      _sum: { amountCents: true },
      _count: true,
    }),
    db.disbursement.findMany({
      where: { partnerId, status: { in: SPENT } },
      distinct: ["campaignId"],
      select: { campaignId: true },
    }),
    db.disbursementDocument.count({
      where: { disbursement: { partnerId, status: { in: SPENT } } },
    }),
  ]);

  return {
    receivedCents: transfers._sum.amountCents ?? 0,
    transferCount: transfers._count,
    campaignCount: campaigns.length,
    documentCount: documents,
  };
}
