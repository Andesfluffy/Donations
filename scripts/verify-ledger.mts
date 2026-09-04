/**
 * Ledger integrity check.
 *
 * Recomputes every public figure two independent ways — through
 * `lib/finance.ts` and through raw SQL — and fails if they disagree. Also
 * checks that the cached `CampaignFinancials` rows still match a live
 * computation, and that per-campaign totals reconcile to the org totals.
 *
 * Run against any environment: `npx tsx scripts/verify-ledger.ts`
 * Read-only; safe to run against production.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { db } = await import("../src/lib/db");
const { getCampaignFinancials, getOrgFinancials, getCampaignBreakdown } = await import(
  "../src/lib/finance"
);
const { formatMoney } = await import("../src/lib/money");

let failures = 0;

function check(label: string, actual: number, expected: number) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "  ok  " : " FAIL "} ${label.padEnd(46)} ${actual}${ok ? "" : `  ≠  ${expected}`}`,
  );
}

/** Deliberately not using the Prisma aggregate helpers finance.ts relies on —
 *  an independent path is the only way this check means anything. */
async function rawTotals() {
  const [r] = await db.$queryRaw<{ raised: bigint }[]>`
    SELECT COALESCE(SUM("netCents"), 0)::bigint AS raised
    FROM "Donation" WHERE status = 'SUCCEEDED'`;
  const [d] = await db.$queryRaw<{ disbursed: bigint }[]>`
    SELECT COALESCE(SUM("amountCents"), 0)::bigint AS disbursed
    FROM "Disbursement" WHERE status IN ('SENT', 'CONFIRMED', 'REPORTED')`;
  const [o] = await db.$queryRaw<{ overhead: bigint }[]>`
    SELECT COALESCE(SUM(d."amountCents"), 0)::bigint AS overhead
    FROM "Disbursement" d
    JOIN "AllocationCategory" c ON c.id = d."categoryId"
    WHERE d.status IN ('SENT', 'CONFIRMED', 'REPORTED') AND c."isOverhead" = true`;

  return {
    raised: Number(r.raised),
    disbursed: Number(d.disbursed),
    overhead: Number(o.overhead),
  };
}

async function main() {
  const org = await getOrgFinancials();
  const raw = await rawTotals();

  console.log("\nOrganisation totals — finance.ts vs independent SQL");
  check("raised", org.raisedCents, raw.raised);
  check("disbursed", org.disbursedCents, raw.disbursed);
  check("overhead", org.overheadCents, raw.overhead);
  check("inTransit = raised − disbursed", org.inTransitCents, raw.raised - raw.disbursed);

  console.log("\nCached CampaignFinancials vs live computation");
  const campaigns = await db.campaign.findMany({ include: { financials: true } });
  let sumRaised = 0;
  let sumDisbursed = 0;

  for (const campaign of campaigns) {
    const live = await getCampaignFinancials(campaign.id);
    sumRaised += live.raisedCents;
    sumDisbursed += live.disbursedCents;
    check(`${campaign.slug} · raised`, Number(campaign.financials?.raisedCents ?? -1), live.raisedCents);
    check(
      `${campaign.slug} · disbursed`,
      Number(campaign.financials?.disbursedCents ?? -1),
      live.disbursedCents,
    );
  }

  console.log("\nCampaign totals reconcile to organisation totals");
  check("Σ campaign raised", sumRaised, org.raisedCents);
  check("Σ campaign disbursed", sumDisbursed, org.disbursedCents);

  console.log("\nAllocation breakdown accounts for all spend");
  for (const campaign of campaigns) {
    const breakdown = await getCampaignBreakdown(campaign.id);
    const total = breakdown.reduce((sum, row) => sum + row.actualCents, 0);
    const live = await getCampaignFinancials(campaign.id);
    check(`${campaign.slug} · Σ categories`, total, live.disbursedCents);
  }

  console.log("\nSummary");
  console.log(`  received    ${formatMoney(org.raisedCents, "USD")}  (${org.donationCount} gifts)`);
  console.log(`  delivered   ${formatMoney(org.disbursedCents, "USD")}`);
  console.log(
    `  overhead    ${org.overheadRatio === null ? "n/a" : `${(org.overheadRatio * 100).toFixed(2)}% of spend`}`,
  );

  console.log(failures === 0 ? "\nAll ledger checks passed.\n" : `\n${failures} check(s) FAILED.\n`);

  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

await main();
