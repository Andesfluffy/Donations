import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CRISIS_TYPE_LABELS, URGENCY_LABELS, URGENCY_TONES } from "@/lib/campaign-display";
import { db } from "@/lib/db";
import { formatMoneyCompact, progressPercent } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Active crises",
  description:
    "The emergencies we are currently responding to, and what our partners and the wider humanitarian community are reporting.",
};

const SOURCE_LABELS: Record<string, string> = {
  RELIEFWEB: "ReliefWeb",
  VATICAN_NEWS: "Vatican News",
  CARITAS: "Caritas Internationalis",
  EDITORIAL: "Our reporting",
};

export default async function CrisesPage() {
  const [campaigns, feedItems] = await Promise.all([
    db.campaign.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ urgency: "asc" }, { countryName: "asc" }],
      include: { financials: true, partner: { select: { name: true, slug: true } } },
    }),
    // Only items an editor has not dismissed. This is a monitoring feed, not
    // our own publication, so it is presented as links out rather than as
    // articles under our masthead.
    db.crisisFeedItem.findMany({
      where: { dismissedAt: null },
      orderBy: { publishedAt: "desc" },
      take: 12,
    }),
  ]);

  // Group appeals by country so a reader sees places, not campaign rows.
  const byCountry = new Map<string, typeof campaigns>();
  for (const campaign of campaigns) {
    const list = byCountry.get(campaign.countryName) ?? [];
    list.push(campaign);
    byCountry.set(campaign.countryName, list);
  }

  return (
    <div className="container-page py-14 md:py-16">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Active crises
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Where we are currently working, and what is being reported from those
          places. We fund a partner in each one — the appeals below say who.
        </p>
      </header>

      <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="responding-heading" className="min-w-0">
          <h2
            id="responding-heading"
            className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
          >
            Where we are responding
          </h2>

          {byCountry.size === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-10 text-center text-ink-muted">
              No appeals are currently open.
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              {[...byCountry.entries()].map(([country, list]) => (
                <section key={country} aria-labelledby={`country-${country}`}>
                  <h3
                    id={`country-${country}`}
                    className="font-serif text-xl font-semibold text-ink"
                  >
                    {country}
                  </h3>

                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {list.map((campaign) => {
                      const raised = Number(campaign.financials?.raisedCents ?? 0n);
                      const percent = progressPercent(raised, campaign.goalCents);

                      return (
                        <li key={campaign.id} className="py-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={URGENCY_TONES[campaign.urgency]}>
                              {URGENCY_LABELS[campaign.urgency]}
                            </Badge>
                            <Badge>{CRISIS_TYPE_LABELS[campaign.crisisType]}</Badge>
                          </div>

                          <h4 className="mt-3 font-serif text-lg font-semibold">
                            <Link
                              href={`/appeals/${campaign.slug}`}
                              className="text-ink hover:text-primary"
                            >
                              {campaign.title}
                            </Link>
                          </h4>

                          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                            {campaign.summary}
                          </p>

                          {campaign.partner && (
                            <p className="mt-2 text-sm text-ink-subtle">
                              Delivered by{" "}
                              <Link
                                href={`/partners/${campaign.partner.slug}`}
                                className="text-ink-muted underline underline-offset-2 hover:text-ink"
                              >
                                {campaign.partner.name}
                              </Link>
                            </p>
                          )}

                          <div className="mt-4 max-w-md">
                            <Progress
                              value={percent}
                              label={`${Math.round(percent)}% of goal raised`}
                            />
                            <p className="mt-2 text-sm text-ink-muted">
                              <span className="font-medium text-ink">
                                {formatMoneyCompact(raised, campaign.currency)}
                              </span>{" "}
                              of {formatMoneyCompact(campaign.goalCents, campaign.currency)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        {/* Monitoring feed. Presented as links out, with the source named on
            every row — this is other people's reporting, not ours. */}
        <aside aria-labelledby="feed-heading">
          <h2
            id="feed-heading"
            className="font-serif text-2xl font-semibold tracking-tight text-ink"
          >
            What is being reported
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Headlines we monitor from humanitarian and Church sources. These are
            links to their coverage, not our own.
          </p>

          {feedItems.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-8 text-center text-sm text-ink-muted">
              Nothing has been ingested yet.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {feedItems.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <time
                      dateTime={item.publishedAt.toISOString()}
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
                    >
                      {item.publishedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                      {SOURCE_LABELS[item.source] ?? item.source}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-[0.9375rem] leading-snug font-medium">
                    <a
                      href={item.url}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      className="inline text-ink hover:text-primary"
                    >
                      {item.title}
                      <ExternalLink
                        className="ml-1 inline h-3 w-3 shrink-0 align-baseline"
                        aria-hidden="true"
                      />
                      <span className="sr-only">(opens on {SOURCE_LABELS[item.source]})</span>
                    </a>
                  </h3>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/news"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
          >
            Our own updates
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
