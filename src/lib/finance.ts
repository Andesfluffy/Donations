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
