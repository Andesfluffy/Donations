import Link from "next/link";
import { ArrowRight, FileText, ReceiptText, ScrollText } from "lucide-react";

import { AppealCard, type AppealCardData } from "@/components/appeal-card";
import { HomeHero } from "@/components/home-hero";
import { db } from "@/lib/db";
import { getOrgFinancials } from "@/lib/finance";
import { formatMoneyCompact, formatCount } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";

// Live financial totals must never be served stale — a cached "raised" figure
// is exactly the kind of small inaccuracy this site exists to avoid.
export const dynamic = "force-dynamic";

async function getActiveAppeals(limit: number): Promise<AppealCardData[]> {
  const campaigns = await db.campaign.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ urgency: "asc" }, { startedAt: "desc" }],
    take: limit,
    include: { financials: true },
  });

  return campaigns.map((campaign) => ({
    slug: campaign.slug,
    title: campaign.title,
    summary: campaign.summary,
    countryName: campaign.countryName,
    crisisType: campaign.crisisType,
    urgency: campaign.urgency,
    goalCents: campaign.goalCents,
    currency: campaign.currency,
    coverImageUrl: campaign.coverImageUrl,
    coverImageAlt: campaign.coverImageAlt,
    raisedCents: Number(campaign.financials?.raisedCents ?? 0n),
  }));
}

export default async function HomePage() {
  const [appeals, org, latestPosts] = await Promise.all([
    getActiveAppeals(6),
    getOrgFinancials(),
    db.newsPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, publishedAt: true },
    }),
  ]);

  const currency = siteConfig.defaultCurrency;
  const deliveredPercent =
    org.disbursedRatio === null ? null : Math.round(org.disbursedRatio * 100);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <HomeHero year={new Date().getFullYear()} />

      {/* ---------------------------------------------------------------- */}
      {/* Live totals — every figure derived from lib/finance.ts           */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="totals-heading" className="border-b border-line bg-bg">
        <h2 id="totals-heading" className="sr-only">
          Funds received and delivered
        </h2>
        <div className="container-page grid gap-px overflow-hidden py-0 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Received"
            value={formatMoneyCompact(org.raisedCents, currency)}
            note={`${formatCount(org.donationCount)} gifts`}
          />
          <StatTile
            label="Delivered to partners"
            value={formatMoneyCompact(org.disbursedCents, currency)}
            note={deliveredPercent === null ? "No funds yet" : `${deliveredPercent}% of income`}
          />
          <StatTile
            label="Held for committed work"
            value={formatMoneyCompact(Math.max(0, org.inTransitCents), currency)}
            note="Awaiting disbursement"
          />
          <StatTile
            label="Overhead"
            value={
              org.overheadRatio === null ? "—" : `${(org.overheadRatio * 100).toFixed(1)}%`
            }
            note="Of funds spent"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Appeals                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="appeals-heading" className="container-page py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="appeals-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Current appeals
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Each one funds a named partner working in the affected community.
            </p>
          </div>
          <Link
            href="/appeals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
          >
            All appeals
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {appeals.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {appeals.map((appeal) => (
              <AppealCard key={appeal.slug} appeal={appeal} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-10 text-center text-ink-muted">
            No active appeals are published yet.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The transparency promise — the site's actual argument            */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="promise-heading" className="border-y border-line bg-surface">
        <div className="container-page py-20">
          <div className="max-w-2xl">
            <h2
              id="promise-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              No number on this site was typed in by hand
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Totals are computed from the donation and disbursement records
              themselves. When we correct a mistake, the original entry stays
              visible and a correcting entry sits beside it.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <PromiseCard
              icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
              title="A dated ledger, not a pie chart"
              body="Every transfer lists the date, the receiving organisation, the amount and what it was for."
            />
            <PromiseCard
              icon={<ReceiptText className="h-5 w-5" aria-hidden="true" />}
              title="Receipts attached"
              body="Invoices, field reports and photographs are filed against the transfer they document."
            />
            <PromiseCard
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              title="Overhead stated plainly"
              body="Our administrative share is published as a percentage of funds spent, not hidden in a footnote."
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Latest updates                                                   */}
      {/* ---------------------------------------------------------------- */}
      {latestPosts.length > 0 && (
        <section aria-labelledby="updates-heading" className="container-page py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              id="updates-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              From the field
            </h2>
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              All updates
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {latestPosts.map((post) => (
              <article key={post.slug}>
                {post.publishedAt && (
                  <time
                    dateTime={post.publishedAt.toISOString()}
                    className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
                  >
                    {post.publishedAt.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                )}
                <h3 className="mt-2 font-serif text-xl leading-snug font-semibold">
                  <Link href={`/news/${post.slug}`} className="hover:text-primary">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border-b border-line py-8 sm:border-r sm:px-6 sm:last:border-r-0 lg:py-10">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </p>
      <p className="tabular mt-2 font-serif text-3xl font-semibold text-ink lg:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </div>
  );
}

// Named PromiseCard, not Promise: a local `Promise` shadows the global and
// silently breaks every `Promise.all` in the module.
function PromiseCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        {icon}
      </span>
      <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
