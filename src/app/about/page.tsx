import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PARTNER_TYPE_LABELS } from "@/lib/campaign-display";
import { db } from "@/lib/db";
import { getOrgFinancials } from "@/lib/finance";
import { formatCount, formatMoneyCompact } from "@/lib/money";
import { hasPlaceholderLegalDetails, siteConfig } from "@/lib/site-config";

// The page states live totals, so it must not be served from cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Who we are, who receives the money, and the rules we hold ourselves to — including the ones that make the published ledger hard to fake.",
};

export default async function AboutPage() {
  const [org, partners, campaignCount, documentCount] = await Promise.all([
    getOrgFinancials(),
    db.partner.findMany({
      orderBy: [{ countryName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        countryName: true,
        description: true,
        vettedAt: true,
      },
    }),
    db.campaign.count({ where: { status: { in: ["ACTIVE", "FUNDED", "CLOSED"] } } }),
    db.disbursementDocument.count(),
  ]);

  const currency = siteConfig.defaultCurrency;
  const detailsPending = hasPlaceholderLegalDetails();

  // Counted off the partners themselves rather than the appeals: the figure
  // sits under "partner organisations" and has to mean what it says there.
  const partnerCountries = new Set(partners.map((partner) => partner.countryName)).size;

  // A sample here, the whole list on /partners. The count beside the link is
  // the real total, so a short list never reads as the full roster.
  const featuredPartners = partners.slice(0, 6);

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-line bg-surface">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
              About us
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              A relief fund that shows its books
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              {siteConfig.name} raises money for communities facing conflict,
              famine and disaster, and hands it to Catholic organisations already
              working in those communities. What makes us different is not the
              promise — every appeal makes that promise. It is that you can check
              it: every gift received and every transfer sent is published, dated
              and attributable, down to the receipt.
            </p>
          </div>
        </div>
      </header>

      {/* Live scale of the work. Every figure here is derived in finance.ts. */}
      <section aria-labelledby="scale-heading" className="border-b border-line">
        <h2 id="scale-heading" className="sr-only">
          The work so far
        </h2>
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Received"
            value={formatMoneyCompact(org.raisedCents, currency)}
            note={`from ${formatCount(org.donationCount)} gifts`}
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
            label="Partner organisations"
            value={formatCount(partners.length)}
            note={`in ${formatCount(partnerCountries)} ${
              partnerCountries === 1 ? "country" : "countries"
            }`}
          />
          <Stat
            label="Appeals opened"
            value={formatCount(campaignCount)}
            note={`${formatCount(documentCount)} documents on file`}
          />
        </div>
      </section>

      <div className="container-page py-16 md:py-20">
        {/* How a gift travels ------------------------------------------- */}
        <section aria-labelledby="chain-heading">
          <div className="max-w-2xl">
            <h2
              id="chain-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              What happens to a gift
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Four steps, each of which leaves a record you can read back.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <Step
              n={1}
              title="You give to a named appeal"
              body="Your card is charged by Stripe. The gift is recorded only once Stripe confirms it settled — not when you land on the thank-you page — so the figure shown as received is money genuinely in the account, after card fees."
            />
            <Step
              n={2}
              title="A vetted partner receives it"
              body="Funds go to an organisation already working in the affected community: a national Caritas office, a diocese, a religious order or a parish network. We check who they are before the first transfer and publish the date we did."
            />
            <Step
              n={3}
              title="The transfer is published"
              body="Date, amount, receiving organisation, category and purpose, with the bank reference an auditor would need to tie it to a statement. Invoices, field reports and photographs are filed against the transfer they document."
            />
            <Step
              n={4}
              title="Corrections are additions"
              body="A published entry is never edited or deleted. When we get something wrong we add a correcting entry beside it and leave the original visible, marked as superseded. That is what makes the ledger evidence rather than a claim."
            />
          </ol>

          <ButtonLink href="/transparency/ledger" variant="outline" className="mt-12">
            Read the ledger
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </section>

        {/* Commitments ---------------------------------------------------- */}
        <section aria-labelledby="commitments-heading" className="mt-24">
          <div className="max-w-2xl">
            <h2
              id="commitments-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              What we will not do
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Stated plainly, so you can hold us to them.
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            <Commitment title="We will not type a figure in by hand">
              No total on this site was written by a fundraiser. Every currency
              amount is computed from the donation and transfer records
              themselves, which means the site cannot state a number the ledger
              does not support.
            </Commitment>
            <Commitment title="We will not hide administration">
              Our overhead is published as a share of everything we spend, and it
              sits in the same ledger as food and medicine rather than in a
              separate book or a footnote.
            </Commitment>
            <Commitment title="We will not spend one appeal’s gifts on another">
              Money given to a named appeal is spent on that appeal. We do
              sometimes send funds ahead of the giving — releasing money from
              general funds in the first days of an emergency — and where that
              happens the appeal simply shows more delivered than received. The
              ledger shows the timing rather than smoothing it over.
            </Commitment>
            <Commitment title="We will not photograph people as objects of pity">
              People appear here as agents in their own recovery — distributing,
              rebuilding, treating, teaching — and the caption says what they are
              doing. We do not publish images of identifiable children in
              distress, and we do not use a photograph from one emergency to
              illustrate another.
            </Commitment>
          </dl>
        </section>

        {/* Partners -------------------------------------------------------- */}
        <section aria-labelledby="partners-heading" className="mt-24">
          <div className="max-w-2xl">
            <h2
              id="partners-heading"
              className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              Who actually receives the money
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              We are not the ones handing out food. These organisations are, and
              naming them is half of what makes the ledger checkable — every
              transfer in it is addressed to one of them.
            </p>
          </div>

          {featuredPartners.length > 0 ? (
            <ul className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredPartners.map((partner) => (
                <li key={partner.id} className="border-t border-line pt-5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                    {partner.countryName} · {PARTNER_TYPE_LABELS[partner.type]}
                  </p>
                  <h3 className="mt-2 font-serif text-lg leading-snug font-semibold text-ink">
                    <Link href={`/partners/${partner.slug}`} className="hover:text-primary">
                      {partner.name}
                    </Link>
                  </h3>
                  {partner.description && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {partner.description}
                    </p>
                  )}
                  {partner.vettedAt && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                      <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                      Vetted{" "}
                      <time dateTime={partner.vettedAt.toISOString()}>
                        {partner.vettedAt.toLocaleDateString("en-GB", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </time>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-10 text-center text-ink-muted">
              No partner organisations have been published yet.
            </p>
          )}

          {partners.length > 0 && (
            <Link
              href="/partners"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              {partners.length > featuredPartners.length
                ? `All ${formatCount(partners.length)} partner organisations`
                : "Partner organisations in full"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </section>

        {/* Governance ------------------------------------------------------ */}
        <section aria-labelledby="governance-heading" className="mt-24 scroll-mt-24" id="governance">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <h2
                id="governance-heading"
                className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
              >
                Governance
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
                Transparency that depends on our good behaviour is not
                transparency. These are the controls that make the published
                record difficult to quietly rewrite.
              </p>

              <dl className="mt-10 space-y-8">
                <Control title="Income is recorded by the payment processor, not by us">
                  A donation row can only be created by the confirmed webhook
                  from Stripe. No member of staff, admin screen or script can add
                  income to the ledger, so the received total cannot be inflated
                  without inflating what the processor actually settled.
                </Control>
                <Control title="Spending is append-only">
                  Transfer entries cannot be edited or deleted once written. A
                  correction is a new entry pointing at the one it supersedes,
                  and both stay visible. Anyone comparing today’s ledger to a
                  copy taken last month can see exactly what changed.
                </Control>
                <Control title="Every administrative action is logged">
                  Changes to appeals, transfers and documents are recorded with
                  the account that made them and the values before and after.
                </Control>
                <Control title="Impact claims cite a source or are not shown">
                  A stated outcome — meals served, roofs repaired — is published
                  only when it carries a verification date and the source it came
                  from. Unverified figures are withheld rather than rounded up.
                </Control>
              </dl>
            </div>

            <aside className="lg:pt-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Entity disclosures
              </h3>

              {detailsPending ? (
                <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-5 text-sm leading-relaxed text-ink-muted">
                  Registration, trustees and audited accounts are not yet
                  published. This site is not registered to accept live donations
                  and no real entity details have been entered — rather than show
                  a plausible-looking placeholder, we show nothing.
                </p>
              ) : (
                <dl className="mt-4 space-y-5 text-sm">
                  <div>
                    <dt className="font-medium text-ink">Registered entity</dt>
                    <dd className="mt-1 text-ink-muted">
                      {siteConfig.legal.entityName}
                      <span className="block">
                        {siteConfig.legal.registrationAuthority} no.{" "}
                        {siteConfig.legal.registrationNumber}
                      </span>
                    </dd>
                  </div>
                  {siteConfig.governance.trusteeCount !== null && (
                    <div>
                      <dt className="font-medium text-ink">Trustees</dt>
                      <dd className="mt-1 text-ink-muted">
                        {formatCount(siteConfig.governance.trusteeCount)} serving,
                        none remunerated for their service
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium text-ink">Independent auditor</dt>
                    <dd className="mt-1 text-ink-muted">
                      {siteConfig.governance.auditorName}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-ink">Financial year ends</dt>
                    <dd className="mt-1 text-ink-muted">
                      {siteConfig.governance.financialYearEnd}
                    </dd>
                  </div>
                  {siteConfig.governance.annualReportUrl && (
                    <div>
                      <dt className="font-medium text-ink">Annual report</dt>
                      <dd className="mt-1">
                        <a
                          href={siteConfig.governance.annualReportUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="text-primary underline underline-offset-2 hover:text-primary-hover"
                        >
                          Most recent accounts
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              <p className="mt-6 text-sm leading-relaxed text-ink-muted">
                The month-by-month figures behind all of this are on the{" "}
                <Link
                  href="/transparency"
                  className="text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  transparency page
                </Link>
                .
              </p>
            </aside>
          </div>
        </section>

        {/* Contact --------------------------------------------------------- */}
        <section aria-labelledby="contact-heading" className="mt-24 scroll-mt-24" id="contact">
          <div className="rounded-lg border border-line bg-surface p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
              <div>
                <h2
                  id="contact-heading"
                  className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl"
                >
                  Get in touch
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
                  If a figure here does not add up, tell us. We will either
                  explain it or correct it in public, with the original entry
                  left standing. A published mistake is less damaging than a
                  quiet one.
                </p>
                <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">
                  We also want to hear from organisations working in an
                  emergency we have not opened an appeal for, and from donors who
                  need a receipt reissued or a monthly gift changed.
                </p>
              </div>

              <div>
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  Contact details
                </h3>
                {detailsPending ? (
                  <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-5 text-sm leading-relaxed text-ink-muted">
                    No contact address has been published yet. The details in the
                    footer are placeholders, and this notice disappears on its
                    own once real ones are entered.
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

                <ButtonLink href="/appeals" className="mt-8" block>
                  See the current appeals
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Matches the stat row on /transparency: proportional figures rather than
 * tabular, because equal-width digits make a large standalone number look
 * loose. Tabular belongs where digits stack vertically.
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

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="border-t-2 border-line-strong pt-5">
      <span
        aria-hidden="true"
        className="tabular font-serif text-2xl font-semibold text-accent"
      >
        {n}
      </span>
      <h3 className="mt-2 font-serif text-lg leading-snug font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
    </li>
  );
}

function Commitment({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-serif text-xl font-semibold text-ink">{title}</dt>
      <dd className="mt-3 leading-relaxed text-ink-muted">{children}</dd>
    </div>
  );
}

function Control({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-season pl-5">
      <dt className="font-medium text-ink">{title}</dt>
      <dd className="mt-2 leading-relaxed text-ink-muted">{children}</dd>
    </div>
  );
}
