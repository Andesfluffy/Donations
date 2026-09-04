import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LedgerTable, type LedgerRow } from "@/components/ledger-table";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getCampaignFinancials } from "@/lib/finance";
import { formatMoney } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your receipt",
  // A receipt link is unguessable but shareable; keep it out of search results.
  robots: { index: false, follow: false, nocache: true },
};

interface ReceiptPageProps {
  params: Promise<{ ref: string }>;
}

/**
 * Anyone holding the link can open this page, so it shows the gift and where
 * the money went, but masks the donor's email. The full tax receipt goes by
 * email to the address on file, not here.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "•••";

  // Fixed-width mask: revealing the length of the local part is a small leak,
  // and a long address otherwise renders as a wall of dots.
  return `${local.slice(0, 1)}•••••@${domain}`;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { ref } = await params;

  const donation = await db.donation.findUnique({
    where: { publicRef: ref },
    include: {
      donor: { select: { name: true, email: true } },
      campaign: {
        select: { id: true, slug: true, title: true, countryName: true, currency: true },
      },
    },
  });

  if (!donation) notFound();

  // The point of this page: not just "we got your money" but what happened to
  // it afterwards.
  const [financials, disbursements] = donation.campaign
    ? await Promise.all([
        getCampaignFinancials(donation.campaign.id),
        db.disbursement.findMany({
          where: { campaignId: donation.campaign.id },
          orderBy: { disbursedAt: "desc" },
          include: { partner: true, category: true, documents: true },
        }),
      ])
    : [null, []];

  const ledgerRows: LedgerRow[] = disbursements.map((d) => ({
    id: d.id,
    disbursedAt: d.disbursedAt,
    amountCents: d.amountCents,
    currency: d.currency,
    description: d.description,
    reference: d.reference,
    status: d.status,
    categoryName: d.category.name,
    partnerName: d.partner.name,
    partnerSlug: d.partner.slug,
    correctsId: d.correctsId,
    documents: d.documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      fileUrl: doc.fileUrl,
    })),
  }));

  const refunded = donation.status === "REFUNDED";

  return (
    <div className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Receipt · {donation.publicRef}
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {refunded ? "This gift was refunded" : "Thank you for your gift"}
          </h1>
        </header>

        {refunded && (
          <p role="status" className="mt-6 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
            This donation was refunded on{" "}
            {donation.refundedAt?.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . It is no longer counted toward the appeal total.
          </p>
        )}

        {/* The gift ---------------------------------------------------- */}
        <section
          aria-labelledby="gift-heading"
          className="mt-8 rounded-lg border border-line bg-surface p-6 md:p-8"
        >
          <h2 id="gift-heading" className="sr-only">
            Donation details
          </h2>

          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-subtle">Amount</dt>
              <dd className="tabular mt-1 font-serif text-3xl font-semibold text-ink">
                {formatMoney(donation.amountCents, donation.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-subtle">Date</dt>
              <dd className="tabular mt-1 text-ink">
                {donation.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-subtle">Designated to</dt>
              <dd className="mt-1 text-ink">
                {donation.campaign ? (
                  <Link
                    href={`/appeals/${donation.campaign.slug}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {donation.campaign.title}
                  </Link>
                ) : (
                  "Where the need is greatest"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-subtle">Type</dt>
              <dd className="mt-1 text-ink">
                {donation.type === "RECURRING" ? "Monthly gift" : "One-off gift"}
              </dd>
            </div>
          </dl>

          {/* Fees stated plainly rather than buried. */}
          <div className="mt-6 border-t border-line pt-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Charged to your card</dt>
                <dd className="tabular text-ink">
                  {formatMoney(donation.amountCents, donation.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Card processing fee
                  {donation.feeCovered && " (which you chose to cover)"}
                </dt>
                <dd className="tabular text-ink">
                  −{formatMoney(donation.feeCents, donation.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-medium">
                <dt className="text-ink">Reaching the appeal</dt>
                <dd className="tabular text-ink">
                  {formatMoney(donation.netCents, donation.currency)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 border-t border-line pt-6 text-sm text-ink-subtle">
            <p>
              Issued to {donation.donor.name ?? "an anonymous donor"} ·{" "}
              {maskEmail(donation.donor.email)}
            </p>
            <p className="mt-2">
              {siteConfig.legal.entityName} ·{" "}
              {siteConfig.legal.registrationAuthority} no.{" "}
              {siteConfig.legal.registrationNumber}
            </p>
          </div>
        </section>

        {/* Where it went ----------------------------------------------- */}
        {donation.campaign && financials && (
          <section aria-labelledby="where-heading" className="mt-14">
            <h2
              id="where-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              Where this appeal&rsquo;s money has gone
            </h2>
            <p className="mt-3 text-ink-muted">
              Your gift joined{" "}
              <span className="tabular font-medium text-ink">
                {formatMoney(financials.raisedCents, donation.campaign.currency, {
                  round: true,
                })}
              </span>{" "}
              raised for {donation.campaign.title}, of which{" "}
              <span className="tabular font-medium text-ink">
                {formatMoney(financials.disbursedCents, donation.campaign.currency, {
                  round: true,
                })}
              </span>{" "}
              has so far been transferred to partners in{" "}
              {donation.campaign.countryName}.
            </p>

            <div className="mt-8">
              <LedgerTable rows={ledgerRows} />
            </div>

            <ButtonLink
              href={`/appeals/${donation.campaign.slug}`}
              variant="outline"
              className="mt-8"
            >
              See the full appeal
            </ButtonLink>
          </section>
        )}
      </div>
    </div>
  );
}
