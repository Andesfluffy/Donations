import type { Metadata } from "next";
import Link from "next/link";

import { IntentionForm, type IntentionFormAppeal } from "@/components/intention-form";
import { PrayerButton } from "@/components/prayer-button";
import { getLiturgicalSeason, seasonLabel } from "@/lib/liturgical";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prayer intentions",
  description:
    "Intentions offered for the communities our appeals serve, and for the people delivering the work.",
};

export default async function PrayPage() {
  const [intentions, campaigns] = await Promise.all([
    // Only moderated intentions are public.
    db.prayerIntention.findMany({
      where: { approvedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { campaign: { select: { slug: true, title: true, countryName: true } } },
    }),
    db.campaign.findMany({
      where: { status: "ACTIVE" },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  const appeals: IntentionFormAppeal[] = campaigns;
  const season = getLiturgicalSeason();

  return (
    <div className="container-page py-14 md:py-16">
      <header className="max-w-3xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
          {seasonLabel(season)}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Prayer intentions
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Money is not the only thing the Church sends. These are intentions
          offered for the communities our appeals serve, and for the people
          carrying the work out — many of whom have lost as much as those they
          are helping.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="intentions-heading" className="min-w-0">
          <h2
            id="intentions-heading"
            className="font-serif text-2xl font-semibold tracking-tight text-ink"
          >
            Offered by others
          </h2>

          {intentions.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-12 text-center text-ink-muted">
              No intentions have been published yet. Yours could be the first.
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {intentions.map((intention) => (
                <li
                  key={intention.id}
                  className="rounded-lg border border-line bg-surface p-5"
                >
                  <blockquote>
                    <p className="text-[1.0625rem] leading-relaxed text-ink">
                      {intention.text}
                    </p>
                  </blockquote>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-subtle">
                      {intention.name ? intention.name : "Anonymous"}
                      {intention.campaign && (
                        <>
                          {" · "}
                          <Link
                            href={`/appeals/${intention.campaign.slug}`}
                            className="text-ink-muted underline underline-offset-2 hover:text-ink"
                          >
                            {intention.campaign.countryName}
                          </Link>
                        </>
                      )}
                    </p>

                    <PrayerButton
                      intentionId={intention.id}
                      count={intention.prayerCount}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-8">
          <IntentionForm appeals={appeals} />

          <section
            aria-labelledby="give-heading"
            className="rounded-lg border border-line bg-surface-sunken p-6"
          >
            <h2 id="give-heading" className="font-serif text-lg font-semibold text-ink">
              Alongside prayer
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Every appeal on this site funds a named partner already working in
              the affected community, and publishes what it spends.
            </p>
            <Link
              href="/appeals"
              className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-hover"
            >
              See the current appeals
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
