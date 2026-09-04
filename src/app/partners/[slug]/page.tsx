import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { LedgerTable, type LedgerRow } from "@/components/ledger-table";
import { Badge } from "@/components/ui/badge";
import { PARTNER_TYPE_LABELS } from "@/lib/campaign-display";
import { db } from "@/lib/db";
import { getPartnerFinancials } from "@/lib/finance";
import { formatCount, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

interface PartnerPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PartnerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const partner = await db.partner.findUnique({
    where: { slug },
    select: { name: true, description: true, countryName: true },
  });

  if (!partner) return { title: "Partner not found" };

  return {
    title: partner.name,
    description:
      partner.description ??
      `An implementing partner delivering emergency relief in ${partner.countryName}.`,
  };
}

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { slug } = await params;

  const partner = await db.partner.findUnique({
    where: { slug },
    include: {
      campaigns: {
        where: { status: { in: ["ACTIVE", "FUNDED", "CLOSED"] } },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!partner) notFound();

  const [financials, disbursements] = await Promise.all([
    getPartnerFinancials(partner.id),
    db.disbursement.findMany({
      where: { partnerId: partner.id },
      orderBy: { disbursedAt: "desc" },
      include: { partner: true, category: true, documents: true },
      take: 100,
    }),
  ]);

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

  const currency = disbursements[0]?.currency ?? "USD";

  return (
    <article>
      <header className="border-b border-line bg-surface">
        <div className="container-page py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/partners" className="text-ink-subtle hover:text-ink">
              Partners
            </Link>
            <span className="mx-2 text-ink-subtle" aria-hidden="true">
              /
            </span>
            <span className="text-ink-muted">{partner.countryName}</span>
          </nav>

          <div className="flex flex-wrap items-start gap-6">
            {partner.logoUrl && (
              <Image
                src={partner.logoUrl}
                alt=""
                width={64}
                height={64}
                className="rounded-lg"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Badge>{PARTNER_TYPE_LABELS[partner.type]}</Badge>
                <Badge>{partner.countryName}</Badge>
                {partner.vettedAt && (
                  <Badge tone="success">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    Vetted
                  </Badge>
                )}
              </div>

              <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                {partner.name}
              </h1>

              {partner.description && (
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
                  {partner.description}
                </p>
              )}

              {partner.websiteUrl && (
                <a
                  href={partner.websiteUrl}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Visit their website
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Totals, derived from the same rows the ledger below shows. */}
      <section aria-labelledby="totals-heading" className="border-b border-line">
        <h2 id="totals-heading" className="sr-only">
          What this partner has received
        </h2>
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total received"
            value={formatMoney(financials.receivedCents, currency, { round: true })}
          />
          <Stat label="Transfers" value={formatCount(financials.transferCount)} />
          <Stat label="Appeals delivered" value={formatCount(financials.campaignCount)} />
          <Stat label="Documents filed" value={formatCount(financials.documentCount)} />
        </div>
      </section>

      <div className="container-page space-y-14 py-14">
        {/* Vetting ------------------------------------------------------- */}
        <section aria-labelledby="vetting-heading">
          <h2
            id="vetting-heading"
            className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
          >
            How we vetted them
          </h2>

          <div className="mt-5 max-w-2xl space-y-4 leading-relaxed text-ink-muted">
            {partner.registrationNumber && (
              <p>
                Registered as{" "}
                <span className="font-medium text-ink">
                  {partner.registrationNumber}
                </span>{" "}
                in {partner.countryName}.
              </p>
            )}

            {partner.vettedAt ? (
              <>
                <p>
                  Last reviewed{" "}
                  <time dateTime={partner.vettedAt.toISOString()}>
                    {partner.vettedAt.toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                  .
                </p>
                {partner.vettingNotes && <p>{partner.vettingNotes}</p>}
              </>
            ) : (
              <p className="rounded-md border border-warning bg-warning-soft p-4 text-sm text-ink">
                This partner has not yet completed our vetting review. No funds
                are transferred to an unvetted partner.
              </p>
            )}
          </div>
        </section>

        {/* Appeals ------------------------------------------------------- */}
        {partner.campaigns.length > 0 && (
          <section aria-labelledby="appeals-heading">
            <h2
              id="appeals-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              Appeals they deliver
            </h2>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {partner.campaigns.map((campaign) => (
                <li key={campaign.id} className="py-5">
                  <h3 className="font-serif text-lg font-semibold">
                    <Link
                      href={`/appeals/${campaign.slug}`}
                      className="text-ink hover:text-primary"
                    >
                      {campaign.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {campaign.summary}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ledger -------------------------------------------------------- */}
        <section aria-labelledby="ledger-heading">
          <h2
            id="ledger-heading"
            className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
          >
            Every transfer we have made to them
          </h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            The same entries that appear in the main ledger, filtered to this
            organisation.
          </p>
          <div className="mt-8">
            <LedgerTable rows={ledgerRows} />
          </div>
        </section>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-8 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
