import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AboutHero } from "@/components/about-hero";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatCount } from "@/lib/money";
import { hasPlaceholderLegalDetails, siteConfig } from "@/lib/site-config";

// Reads the partner roster live. A cached count would quietly go stale the
// first time a partner is added.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About us",
  description:
    "We fund Catholic institutions already working where the emergency is. Who they are, how we are kept honest, and how to reach us.",
};

export default async function AboutPage() {
  // Grouping rather than counting gives the number of partners and the number
  // of countries they work in from a single query.
  const partnerCountries = await db.partner.groupBy({
    by: ["countryCode"],
    _count: true,
  });

  const partnerCount = partnerCountries.reduce((total, row) => total + row._count, 0);
  const detailsPending = hasPlaceholderLegalDetails();

  return (
    <>
      <AboutHero />

      {/* ------------------------------------------------------------------ */}
      {/* Who receives the money                                             */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="model-heading" className="container-page py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-20">
          <div className="max-w-2xl">
            <h2
              id="model-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Who receives the money
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              We are a funding body, not a field operation. Gifts made here go to
              Catholic institutions that were in the community before the
              emergency and will still be there long after the news crews have
              left: a national Caritas office, a diocese, a religious order, a
              parish network.
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              That is the whole reason this model can work. They already know
              which families are missing from the food queue, and they answer to
              neighbours they will see again next week. We check who they are
              before the first transfer goes out, publish the date we did it, and
              name them on every entry in the ledger.
            </p>
          </div>

          <aside className="lg:pt-3">
            {partnerCount > 0 && (
              <p className="border-l-2 border-season pl-5 text-ink-muted">
                <span className="block font-serif text-3xl font-semibold text-ink">
                  {formatCount(partnerCount)}{" "}
                  {partnerCount === 1 ? "organisation" : "organisations"}
                </span>
                <span className="mt-1 block text-sm">
                  currently receiving funds, in {formatCount(partnerCountries.length)}{" "}
                  {partnerCountries.length === 1 ? "country" : "countries"}
                </span>
              </p>
            )}
            <Link
              href="/partners"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              Every partner we fund
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Governance — the mechanisms, not the promise. The home page already */}
      {/* makes the promise; this section is what enforces it.               */}
      {/* ------------------------------------------------------------------ */}
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
              How we are kept honest
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              A commitment to transparency is worth exactly what the mechanism
              behind it is worth. Ours is built so that breaking the promise
              would take more effort than keeping it.
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
            <Control title="Income is recorded by the payment processor">
              Only a confirmed webhook from Stripe can create a donation record.
              No member of staff, admin screen or script is able to add one, so
              income cannot be written into the books by hand.
            </Control>
            <Control title="Spending is append-only">
              A published transfer is never edited or deleted. A correction is a
              new entry pointing at the one it supersedes, and both stay visible
              — so a copy of the ledger taken last month still reconciles with
              the one published today.
            </Control>
            <Control title="Every administrative action is logged">
              Changes to appeals, transfers and documents are recorded with the
              account that made them and the values before and after.
            </Control>
            <Control title="Outcomes are withheld until verified">
              A stated result is published only once it carries a verification
              date and the source it came from. Unverified figures are held back
              rather than rounded up.
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

      {/* ------------------------------------------------------------------ */}
      {/* Contact                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="contact-heading"
        id="contact"
        className="container-page scroll-mt-24 py-20"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-20">
          <div className="max-w-2xl">
            <h2
              id="contact-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Get in touch
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              If a figure here does not add up, tell us. We will either explain
              it or correct it in public, with the original entry left standing.
              A published mistake is less damaging than a quiet one.
            </p>
            <p className="mt-4 leading-relaxed text-ink-muted">
              We also want to hear from organisations working in an emergency we
              have not opened an appeal for.
            </p>
            <ButtonLink href="/appeals" className="mt-8">
              See the current appeals
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <aside className="lg:pt-3">
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
          </aside>
        </div>
      </section>
    </>
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
