import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandCoins, ScrollText, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getOrgFinancials } from "@/lib/finance";
import { formatCount, formatMoneyCompact } from "@/lib/money";
import { hasPlaceholderLegalDetails, siteConfig } from "@/lib/site-config";

// The page states live totals, so it must not be served from cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Who we are, who receives the money, and the controls that make the published ledger hard to fake.",
};

export default async function AboutPage() {
  const [org, partnerCountries, campaignCount, documentCount] = await Promise.all([
    getOrgFinancials(),
    // Grouping rather than counting gives the number of partners and the number
    // of countries they work in from a single query.
    db.partner.groupBy({ by: ["countryCode"], _count: true }),
    db.campaign.count({ where: { status: { in: ["ACTIVE", "FUNDED", "CLOSED"] } } }),
    db.disbursementDocument.count(),
  ]);

  const currency = siteConfig.defaultCurrency;
  const detailsPending = hasPlaceholderLegalDetails();
  const partnerCount = partnerCountries.reduce((total, row) => total + row._count, 0);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Hero — deliberately typographic. The home page carries the one      */}
      {/* photograph on the site; a second full-bleed image here would be     */}
      {/* decoration, and this page's argument is made in words.             */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-line bg-surface">
        <div className="container-page py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
              <span aria-hidden="true" className="h-px w-8 bg-season" />
              About us
            </p>

            <h1 className="mt-6 font-serif text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-ink md:text-6xl">
              A relief fund that shows its books.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
              {siteConfig.name} funds Catholic organisations already working in
              communities facing conflict, famine and disaster. Every appeal
              makes that promise; ours publishes the ledger that proves it.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/give" size="lg">
                Make a donation
              </ButtonLink>
              <ButtonLink href="/transparency/ledger" variant="outline" size="lg">
                Read the ledger
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Live totals — every figure derived from lib/finance.ts ------------ */}
      <section aria-labelledby="scale-heading" className="border-b border-line bg-bg">
        <h2 id="scale-heading" className="sr-only">
          The work so far
        </h2>
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Received"
            value={formatMoneyCompact(org.raisedCents, currency)}
            note={`${formatCount(org.donationCount)} gifts`}
          />
          <StatTile
            label="Delivered to partners"
            value={formatMoneyCompact(org.disbursedCents, currency)}
            note={
              org.disbursedRatio === null
                ? "No funds yet"
                : `${Math.round(org.disbursedRatio * 100)}% of income`
            }
          />
          <StatTile
            label="Partner organisations"
            value={formatCount(partnerCount)}
            note={`In ${formatCount(partnerCountries.length)} ${
              partnerCountries.length === 1 ? "country" : "countries"
            }`}
          />
          <StatTile
            label="Appeals opened"
            value={formatCount(campaignCount)}
            note={`${formatCount(documentCount)} documents on file`}
          />
        </div>
      </section>

      {/* What happens to a gift -------------------------------------------- */}
      <section aria-labelledby="chain-heading" className="container-page py-20">
        <div className="max-w-2xl">
          <h2
            id="chain-heading"
            className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            What happens to a gift
          </h2>
          <p className="mt-3 text-ink-muted">
            Three steps, each leaving a record you can read back.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <Card
            icon={<HandCoins className="h-5 w-5" aria-hidden="true" />}
            title="You give to a named appeal"
            body="The gift is recorded only once Stripe confirms it settled, so the figure shown as received is money genuinely in the account, after card fees."
          />
          <Card
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            title="A vetted partner receives it"
            body="Funds go to a Caritas office, diocese, religious order or parish network already working in the community. We publish who they are and when we checked them."
            link={{ href: "/partners", label: "Our partners" }}
          />
          <Card
            icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
            title="The transfer is published"
            body="Date, amount, recipient and purpose, with the bank reference an auditor would need — and the invoices and field reports filed against it."
            link={{ href: "/transparency/ledger", label: "The full ledger" }}
          />
        </div>
      </section>

      {/* Governance --------------------------------------------------------- */}
      <section
        aria-labelledby="governance-heading"
        id="governance"
        className="scroll-mt-24 border-y border-line bg-surface"
      >
        <div className="container-page py-20">
          <div className="max-w-2xl">
            <h2
              id="governance-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Why you do not have to take our word for it
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Transparency that depends on our good behaviour is not
              transparency. These are the controls that make the published
              record difficult to quietly rewrite.
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
            <Control title="Income is recorded by the processor, not by us">
              Only a confirmed Stripe webhook can create a donation. No member of
              staff or admin screen can add income, so the received total cannot
              be inflated beyond what actually settled.
            </Control>
            <Control title="Spending is append-only">
              A published transfer is never edited or deleted. Corrections are
              new entries pointing at the ones they supersede, and both stay
              visible.
            </Control>
            <Control title="Overhead is a line, not a footnote">
              Administration sits in the same ledger as food and medicine, and is
              published as a share of everything we spend.
            </Control>
            <Control title="Impact claims cite a source or are not shown">
              An outcome is published only with a verification date and the
              source it came from. Unverified figures are withheld.
            </Control>
          </dl>

          {detailsPending && (
            <p className="mt-12 max-w-2xl rounded-lg border border-dashed border-line-strong bg-surface-sunken p-5 text-sm leading-relaxed text-ink-muted">
              Registration, trustees and audited accounts are not yet published.
              This site is not registered to accept live donations, and rather
              than show a plausible-looking placeholder we show nothing.
            </p>
          )}
        </div>
      </section>

      {/* Contact ------------------------------------------------------------ */}
      <section
        aria-labelledby="contact-heading"
        id="contact"
        className="container-page scroll-mt-24 py-20"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2
              id="contact-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Get in touch
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
              If a figure here does not add up, tell us. We will either explain
              it or correct it in public, with the original entry left standing.
              A published mistake is less damaging than a quiet one.
            </p>
            <ButtonLink href="/appeals" className="mt-8">
              See the current appeals
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <div className="lg:pt-2">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Contact details
            </h3>
            {detailsPending ? (
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                No contact address has been published yet. The details in the
                footer are placeholders, and this notice disappears on its own
                once real ones are entered.
              </p>
            ) : (
              <address className="mt-4 space-y-4 text-sm not-italic text-ink-muted">
                <div>
                  <span className="block font-medium text-ink">
                    {siteConfig.legal.entityName}
                  </span>
                  {siteConfig.legal.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </div>
                <div>
                  <a
                    href={`mailto:${siteConfig.legal.email}`}
                    className="block text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    {siteConfig.legal.email}
                  </a>
                  <a
                    href={`tel:${siteConfig.legal.phone.replace(/[^+\d]/g, "")}`}
                    className="block text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    {siteConfig.legal.phone}
                  </a>
                </div>
              </address>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/** Same tile as the home page's totals row, so the two read as one system. */
function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
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

function Card({
  icon,
  title,
  body,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  link?: { href: string; label: string };
}) {
  return (
    <div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        {icon}
      </span>
      <h3 className="mt-4 font-serif text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
          {link.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function Control({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-season pl-5">
      <dt className="font-medium text-ink">{title}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</dd>
    </div>
  );
}
