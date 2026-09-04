import type { Metadata } from "next";

import { DonationForm, type AppealOption } from "@/components/donation-form";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Make a donation",
  description:
    "Give to an emergency appeal, or let us direct your gift to where partners report the sharpest shortfall.",
};

interface GivePageProps {
  searchParams: Promise<{ appeal?: string; frequency?: string; amount?: string }>;
}

export default async function GivePage({ searchParams }: GivePageProps) {
  const params = await searchParams;

  const campaigns = await db.campaign.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ urgency: "asc" }, { title: "asc" }],
    select: { slug: true, title: true, countryName: true },
  });

  const appeals: AppealOption[] = campaigns;

  // Only prefill from the query string if the appeal is real and open —
  // otherwise the form silently designates a gift to nothing.
  const requested = params.appeal;
  const defaultAppealSlug = appeals.some((a) => a.slug === requested) ? requested : undefined;

  // /monthly links here with ?frequency=monthly. Anything else falls back to a
  // one-off gift rather than trusting the query string.
  const defaultFrequency = params.frequency === "monthly" ? "monthly" : "one_time";

  // Only honour an amount that is genuinely one of our presets for the chosen
  // frequency. An arbitrary query value would let a link preselect any figure,
  // including a misleading one.
  const presets =
    defaultFrequency === "monthly"
      ? siteConfig.suggestedMonthlyAmounts
      : siteConfig.suggestedAmounts;
  const requestedAmount = Number(params.amount);
  const defaultAmountCents = (presets as readonly number[]).includes(requestedAmount)
    ? requestedAmount
    : undefined;

  return (
    <div className="container-page py-16 md:py-20">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:pt-4">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Make a donation
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Your gift is passed to a named partner already working in the
            affected community, and every transfer we make from it is published
            on the appeal page with the date, the recipient and the receipt.
          </p>

          <dl className="mt-10 space-y-6 border-t border-line pt-8">
            <div>
              <dt className="font-serif text-lg font-semibold text-ink">
                You will be able to see where it went
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Your receipt links to the ledger for the appeal you gave to, so
                you can follow the money out of our account and into the field.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-lg font-semibold text-ink">
                We publish our overhead
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Administration is a category in the same ledger as everything
                else, stated as a share of what we spend.
              </dd>
            </div>
            <div>
              <dt className="font-serif text-lg font-semibold text-ink">
                Your details stay with us
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                We never sell, rent or swap donor data. Card details are handled
                entirely by Stripe and never reach our servers.
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm md:p-8">
          <DonationForm
            appeals={appeals}
            defaultAppealSlug={defaultAppealSlug}
            defaultFrequency={defaultFrequency}
            defaultAmountCents={defaultAmountCents}
            currency={siteConfig.defaultCurrency}
            suggestedAmounts={siteConfig.suggestedAmounts}
            suggestedMonthlyAmounts={siteConfig.suggestedMonthlyAmounts}
            testMode={isStripeTestMode()}
            configured={isStripeConfigured()}
          />
        </div>
      </div>
    </div>
  );
}
