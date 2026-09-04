import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AllocationComparison } from "@/components/allocation-comparison";
import { LedgerTable, type LedgerRow } from "@/components/ledger-table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CRISIS_TYPE_LABELS, URGENCY_LABELS, URGENCY_TONES } from "@/lib/campaign-display";
import { db } from "@/lib/db";
import { getCampaignBreakdown, getCampaignFinancials } from "@/lib/finance";
import { formatCount, formatMoney, progressPercent } from "@/lib/money";

export const dynamic = "force-dynamic";

interface AppealPageProps {
  params: Promise<{ slug: string }>;
}

async function getCampaign(slug: string) {
  return db.campaign.findUnique({
    where: { slug },
    include: {
      partner: true,
      metrics: { orderBy: { createdAt: "desc" } },
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 4,
      },
    },
  });
}

export async function generateMetadata({ params }: AppealPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await db.campaign.findUnique({
    where: { slug },
    select: { title: true, summary: true },
  });

  if (!campaign) return { title: "Appeal not found" };

  return {
    title: campaign.title,
    description: campaign.summary,
    openGraph: { title: campaign.title, description: campaign.summary },
  };
}

export default async function AppealPage({ params }: AppealPageProps) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) notFound();

  const [financials, breakdown, disbursements] = await Promise.all([
    getCampaignFinancials(campaign.id),
    getCampaignBreakdown(campaign.id),
    db.disbursement.findMany({
      where: { campaignId: campaign.id },
      orderBy: { disbursedAt: "desc" },
      include: { partner: true, category: true, documents: true },
    }),
  ]);

  const percent = progressPercent(financials.raisedCents, campaign.goalCents);

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

  const verifiedMetrics = campaign.metrics.filter((m) => m.verifiedAt !== null);

  return (
    <article>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-line bg-surface">
        <div className="container-page py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link href="/appeals" className="text-ink-subtle hover:text-ink">
              Appeals
            </Link>
            <span className="mx-2 text-ink-subtle" aria-hidden="true">
              /
            </span>
            <span className="text-ink-muted">{campaign.countryName}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={URGENCY_TONES[campaign.urgency]}>
                  {URGENCY_LABELS[campaign.urgency]}
                </Badge>
                <Badge>{CRISIS_TYPE_LABELS[campaign.crisisType]}</Badge>
                <Badge>{campaign.countryName}</Badge>
              </div>

              <h1 className="mt-5 font-serif text-3xl leading-tight font-semibold tracking-tight text-ink md:text-5xl">
                {campaign.title}
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-ink-muted">{campaign.summary}</p>
            </div>

            {/* Give panel — the totals here come from finance.ts, never props
                passed down from editable content. */}
            <aside
              aria-labelledby="give-panel-heading"
              className="h-fit rounded-lg border border-line bg-bg p-6 shadow-sm lg:sticky lg:top-28"
            >
              <h2 id="give-panel-heading" className="sr-only">
                Support this appeal
              </h2>

              <p className="tabular font-serif text-3xl font-semibold text-ink">
                {formatMoney(financials.raisedCents, campaign.currency, { round: true })}
              </p>
              <p className="tabular mt-1 text-sm text-ink-muted">
                raised of {formatMoney(campaign.goalCents, campaign.currency, { round: true })}{" "}
                goal
              </p>

              <Progress
                value={percent}
                label={`${Math.round(percent)}% of goal raised`}
                className="mt-4"
              />

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
                <div>
                  <dt className="text-ink-subtle">Gifts</dt>
                  <dd className="tabular mt-0.5 font-medium text-ink">
                    {formatCount(financials.donationCount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-subtle">Already delivered</dt>
                  <dd className="tabular mt-0.5 font-medium text-ink">
                    {formatMoney(financials.disbursedCents, campaign.currency, { round: true })}
                  </dd>
                </div>
              </dl>

              <ButtonLink
                href={`/give?appeal=${campaign.slug}`}
                size="lg"
                block
                className="mt-6"
              >
                Give to this appeal
              </ButtonLink>

              <p className="mt-3 text-center text-xs text-ink-subtle">
                Every transfer is published below.
              </p>
            </aside>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-14 py-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0 space-y-14">
          {/* -------------------------------------------------------------- */}
          {/* The situation                                                  */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby="situation-heading">
            <h2
              id="situation-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              The situation
            </h2>
            <div className="mt-5 space-y-4 text-[1.0625rem] leading-relaxed text-ink-muted">
              {campaign.story.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Plan vs delivery                                               */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby="allocation-heading">
            <h2
              id="allocation-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              What we said, and what we did
            </h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              The planned split was set when this appeal opened. The spent
              column is computed from the transfers listed below it.
            </p>
            <div className="mt-8">
              <AllocationComparison breakdown={breakdown} currency={campaign.currency} />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* The ledger                                                     */}
          {/* -------------------------------------------------------------- */}
          <section aria-labelledby="ledger-heading">
            <h2
              id="ledger-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              Every transfer made
            </h2>
            <p className="mt-3 max-w-2xl text-ink-muted">
              Entries are never edited after publication. If we get something
              wrong, a correcting entry is added and the original stays visible.
            </p>
            <div className="mt-8">
              <LedgerTable rows={ledgerRows} />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Updates                                                        */}
          {/* -------------------------------------------------------------- */}
          {campaign.posts.length > 0 && (
            <section aria-labelledby="updates-heading">
              <h2
                id="updates-heading"
                className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
              >
                Updates from this appeal
              </h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {campaign.posts.map((post) => (
                  <li key={post.id} className="py-5">
                    {post.publishedAt && (
                      <time
                        dateTime={post.publishedAt.toISOString()}
                        className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
                      >
                        {post.publishedAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    )}
                    <h3 className="mt-1.5 font-serif text-lg font-semibold">
                      <Link href={`/news/${post.slug}`} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {post.excerpt}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar: partner and verified outcomes                           */}
        {/* ---------------------------------------------------------------- */}
        <aside className="space-y-10">
          {campaign.partner && (
            <section
              aria-labelledby="partner-heading"
              className="rounded-lg border border-line bg-surface p-6"
            >
              <h2
                id="partner-heading"
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
              >
                Who delivers this
              </h2>

              <div className="mt-4 flex items-start gap-3">
                {campaign.partner.logoUrl && (
                  <Image
                    src={campaign.partner.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div>
                  <p className="font-serif text-lg font-semibold text-ink">
                    <Link
                      href={`/partners/${campaign.partner.slug}`}
                      className="hover:text-primary"
                    >
                      {campaign.partner.name}
                    </Link>
                  </p>
                  <p className="text-sm text-ink-subtle">{campaign.partner.countryName}</p>
                </div>
              </div>

              {campaign.partner.description && (
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  {campaign.partner.description}
                </p>
              )}

              {campaign.partner.vettedAt && (
                <p className="mt-4 border-t border-line pt-4 text-xs text-ink-subtle">
                  Last vetted{" "}
                  {campaign.partner.vettedAt.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </section>
          )}

          {verifiedMetrics.length > 0 && (
            <section aria-labelledby="impact-heading">
              <h2
                id="impact-heading"
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
              >
                Verified outcomes
              </h2>
              <dl className="mt-4 space-y-4">
                {verifiedMetrics.map((metric) => (
                  <div key={metric.id} className="border-b border-line pb-4 last:border-0">
                    <dd className="tabular font-serif text-2xl font-semibold text-ink">
                      {formatCount(metric.value)}
                    </dd>
                    <dt className="mt-0.5 text-sm text-ink-muted">
                      {metric.label}
                      {metric.sourceUrl && (
                        <>
                          {" "}
                          <a
                            href={metric.sourceUrl}
                            className="text-primary underline underline-offset-2"
                          >
                            source
                          </a>
                        </>
                      )}
                    </dt>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
