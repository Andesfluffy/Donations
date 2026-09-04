import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AllocationComparison } from "@/components/allocation-comparison";
import { FlowChart, type FlowPoint } from "@/components/flow-chart";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getMonthlyFlow, getOrgBreakdown, getOrgFinancials } from "@/lib/finance";
import { formatCount, formatMoney, formatMoneyCompact } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Where the money goes",
  description:
    "Every figure on this site is computed from donation and disbursement records. Here is the whole picture, with the method behind it.",
};

export default async function TransparencyPage() {
  const [org, breakdown, flow, campaigns, documentCount, partnerCount] = await Promise.all([
    getOrgFinancials(),
    getOrgBreakdown(),
    getMonthlyFlow(12),
    db.campaign.findMany({
      where: { status: { in: ["ACTIVE", "FUNDED", "CLOSED"] } },
      orderBy: { title: "asc" },
      include: { financials: true },
    }),
    db.disbursementDocument.count(),
    db.partner.count(),
  ]);

  const currency = siteConfig.defaultCurrency;

  const flowPoints: FlowPoint[] = flow.map((point) => ({
    monthISO: point.month.toISOString(),
    raisedCents: point.raisedCents,
    disbursedCents: point.disbursedCents,
  }));

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-line bg-surface">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
              Accountability
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Where the money goes
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              Nothing on this page was typed in by a fundraiser. Every figure is
              computed from the donation and transfer records themselves, which
              means the site cannot claim something the ledger does not support.
            </p>
          </div>
        </div>
      </header>

      {/* Headline figures ------------------------------------------------- */}
      <section aria-labelledby="totals-heading" className="border-b border-line">
        <h2 id="totals-heading" className="sr-only">
          Organisation totals
        </h2>
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Received"
            value={formatMoneyCompact(org.raisedCents, currency)}
            note={`${formatCount(org.donationCount)} gifts, net of card fees`}
          />
          <Stat
            label="Delivered to partners"
            value={formatMoneyCompact(org.disbursedCents, currency)}
            note={
              org.disbursedRatio === null
                ? "No funds received yet"
                : `${Math.round(org.disbursedRatio * 100)}% of everything received`
            }
          />
          <Stat
            label="Held for committed work"
            value={formatMoneyCompact(Math.max(0, org.inTransitCents), currency)}
            note="Received but not yet transferred"
          />
          <Stat
            label="Overhead"
            value={org.overheadRatio === null ? "—" : `${(org.overheadRatio * 100).toFixed(1)}%`}
            note="Administration as a share of spend"
          />
        </div>
      </section>

      <div className="container-page grid gap-16 py-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-20">
        <div className="min-w-0 space-y-16">
          {/* Flow over time --------------------------------------------- */}
          <section aria-labelledby="flow-heading">
            <h2
              id="flow-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              Money in, money out
            </h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Funds should move, not accumulate. A gap between the two bars in
              any month is money still with us — either committed to work that
              has not yet been invoiced, or held back deliberately for a
              response we expect to need it.
            </p>
            <div className="mt-8">
              <FlowChart data={flowPoints} currency={currency} />
            </div>
          </section>

          {/* Category breakdown ----------------------------------------- */}
          <section aria-labelledby="breakdown-heading">
            <h2
              id="breakdown-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              What it was spent on
            </h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Across every appeal. Administration appears here as its own line
              rather than being spread invisibly across the others.
            </p>
            <div className="mt-8">
              <AllocationComparison breakdown={breakdown} currency={currency} />
            </div>
          </section>

          {/* Per appeal --------------------------------------------------- */}
          <section aria-labelledby="per-appeal-heading">
            <h2
              id="per-appeal-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              By appeal
            </h2>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <caption className="sr-only">
                  Funds received and delivered for each appeal
                </caption>
                <thead>
                  <tr className="border-b border-line-strong text-left">
                    <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
                      Appeal
                    </th>
                    <th scope="col" className="py-3 pr-4 text-right font-medium text-ink-subtle">
                      Received
                    </th>
                    <th scope="col" className="py-3 pr-4 text-right font-medium text-ink-subtle">
                      Delivered
                    </th>
                    <th scope="col" className="py-3 text-right font-medium text-ink-subtle">
                      Delivered %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const raised = Number(campaign.financials?.raisedCents ?? 0n);
                    const disbursed = Number(campaign.financials?.disbursedCents ?? 0n);
                    const share = raised > 0 ? Math.round((disbursed / raised) * 100) : null;

                    return (
                      <tr key={campaign.id} className="border-b border-line last:border-0">
                        <th scope="row" className="py-3 pr-4 text-left font-normal">
                          <Link
                            href={`/appeals/${campaign.slug}`}
                            className="text-ink hover:text-primary"
                          >
                            {campaign.title}
                          </Link>
                          <span className="mt-0.5 block text-xs text-ink-subtle">
                            {campaign.countryName}
                          </span>
                        </th>
                        <td className="tabular py-3 pr-4 text-right text-ink">
                          {formatMoney(raised, campaign.currency, { round: true })}
                        </td>
                        <td className="tabular py-3 pr-4 text-right text-ink">
                          {formatMoney(disbursed, campaign.currency, { round: true })}
                        </td>
                        <td className="tabular py-3 text-right text-ink-muted">
                          {share === null ? "—" : `${share}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ButtonLink href="/transparency/ledger" className="mt-8">
              Open the full ledger
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </section>
        </div>

        {/* Method ------------------------------------------------------- */}
        <aside className="space-y-10">
          <section
            aria-labelledby="method-heading"
            className="rounded-lg border border-line bg-surface p-6"
          >
            <h2
              id="method-heading"
              className="font-serif text-xl font-semibold tracking-tight text-ink"
            >
              How these numbers are produced
            </h2>

            <dl className="mt-5 space-y-5 text-sm">
              <div>
                <dt className="font-medium text-ink">Received</dt>
                <dd className="mt-1 leading-relaxed text-ink-muted">
                  The sum of donations that actually settled, after card
                  processing fees are deducted. A pledge is not income; a
                  refunded gift stops counting from the day it is refunded.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Delivered</dt>
                <dd className="mt-1 leading-relaxed text-ink-muted">
                  The sum of transfers that have actually left our account.
                  Money committed but not yet sent is shown as held, never as
                  delivered.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Overhead</dt>
                <dd className="mt-1 leading-relaxed text-ink-muted">
                  Spend on administration and governance as a share of all
                  spend. It is a category in the same ledger as food and
                  medicine, not a separate book.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink">Corrections</dt>
                <dd className="mt-1 leading-relaxed text-ink-muted">
                  Ledger entries are never edited after publication. When we get
                  something wrong we add a correcting entry and leave the
                  original visible, marked as superseded.
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="evidence-heading">
            <h2
              id="evidence-heading"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
            >
              Evidence on file
            </h2>
            <dl className="mt-4 space-y-4">
              <div className="border-b border-line pb-4">
                <dd className="font-serif text-2xl font-semibold text-ink">
                  {formatCount(documentCount)}
                </dd>
                <dt className="mt-0.5 text-sm text-ink-muted">
                  receipts, invoices and field reports attached to transfers
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl font-semibold text-ink">
                  {formatCount(partnerCount)}
                </dd>
                <dt className="mt-0.5 text-sm text-ink-muted">
                  vetted partner organisations receiving funds
                </dt>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="questions-heading"
            className="rounded-lg border border-line bg-surface-sunken p-6"
          >
            <h2 id="questions-heading" className="font-serif text-lg font-semibold text-ink">
              Something not adding up?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Tell us and we will either explain it or correct it in public. A
              published mistake is less damaging than a quiet one.
            </p>
            <Link
              href="/about#contact"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              Get in touch
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

/**
 * Stat values use proportional figures, not tabular: equal-width digits make a
 * large standalone number look loose. Tabular belongs where digits align
 * vertically, such as the tables and axis ticks on this page.
 */
function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-b border-line py-8 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 lg:py-10">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-ink lg:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </div>
  );
}
