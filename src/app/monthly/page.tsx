import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, HandCoins, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { getRecurringProgramme } from "@/lib/finance";
import { formatCount, formatMoney, formatMoneyCompact } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Give monthly",
  description:
    "Regular giving is what lets us commit funds to a partner in the first days of an emergency, before an appeal has raised anything.",
};

export default async function MonthlyPage() {
  const programme = await getRecurringProgramme();
  const currency = siteConfig.defaultCurrency;

  return (
    <div>
      <header className="border-b border-line bg-surface">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
              Regular giving
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              The gift that arrives before the appeal does
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              An emergency appeal takes days to write and weeks to fund. The
              need does not wait that long. Regular gifts are what let us wire
              money to a partner in the first days of a crisis, on the strength
              of income we know is coming.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/give?frequency=monthly" size="lg">
                Set up a monthly gift
              </ButtonLink>
              <ButtonLink href="/transparency" variant="outline" size="lg">
                See where it goes
              </ButtonLink>
            </div>
          </div>
        </div>
      </header>

      {/* Programme figures, derived like every other number on the site. */}
      <section aria-labelledby="programme-heading" className="border-b border-line">
        <h2 id="programme-heading" className="sr-only">
          The monthly giving programme in numbers
        </h2>
        <div className="container-page grid sm:grid-cols-3">
          <Stat
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Regular supporters"
            value={formatCount(programme.supporterCount)}
            note={
              programme.supporterCount === 0
                ? "Be the first"
                : "Giving every month"
            }
          />
          <Stat
            icon={<HandCoins className="h-4 w-4" aria-hidden="true" />}
            label="Received in the last 30 days"
            value={formatMoneyCompact(programme.lastThirtyDaysCents, currency)}
            note="Through regular gifts"
          />
          <Stat
            icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
            label="Share of all income"
            value={
              programme.shareOfIncome === null
                ? "—"
                : `${Math.round(programme.shareOfIncome * 100)}%`
            }
            note="The part we can plan against"
          />
        </div>
      </section>

      <div className="container-page grid gap-16 py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <div className="min-w-0 space-y-14">
          <section aria-labelledby="why-heading">
            <h2
              id="why-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              Why regular giving actually matters here
            </h2>
            <div className="mt-5 max-w-[68ch] space-y-4 text-[1.0625rem] leading-relaxed text-ink-muted">
              <p>
                Most charities say monthly giving &ldquo;helps us plan&rdquo;,
                which is true but vague. Here is the specific version.
              </p>
              <p>
                When a partner tells us a displacement site has doubled in a
                week, the useful response is money this week, not money after we
                have written an appeal and waited for it to fund. Predictable
                income is what makes that possible: we can commit against it,
                transfer immediately, and let the appeal replenish the fund
                afterwards.
              </p>
              <p>
                It also lowers what we spend on fundraising. A regular gift
                costs us one payment fee a month and no repeat solicitation,
                which is part of why our overhead figure stays where it is —
                and that figure is published, so you can watch it.
              </p>
            </div>
          </section>

          <section aria-labelledby="expect-heading">
            <h2
              id="expect-heading"
              className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl"
            >
              What to expect
            </h2>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              <Item
                term="You choose the amount and the appeal"
                detail="Give to a specific emergency, or leave it undesignated so we can send it where partners report the sharpest shortfall."
              />
              <Item
                term="One charge a month, on the same date"
                detail="You get a receipt every time, each linking to a page showing what that appeal has spent since your last gift."
              />
              <Item
                term="Cancelling takes one click"
                detail="There is a link in every receipt. No phone call, no retention script, no form asking you to reconsider."
              />
              <Item
                term="We will not write to you constantly"
                detail="Regular supporters hear from us when something significant happens in an appeal they fund, and at most a few times a year otherwise."
              />
            </dl>
          </section>
        </div>

        <aside className="space-y-8">
          <section
            aria-labelledby="amounts-heading"
            className="rounded-lg border border-line bg-surface p-6"
          >
            <h2
              id="amounts-heading"
              className="font-serif text-xl font-semibold tracking-tight text-ink"
            >
              Common monthly amounts
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Any amount is worth giving. These are simply the ones people
              choose most often.
            </p>

            <ul className="mt-5 space-y-2">
              {siteConfig.suggestedMonthlyAmounts.map((amount) => (
                <li key={amount}>
                  <Link
                    href={`/give?frequency=monthly&amount=${amount}`}
                    className="flex items-center justify-between rounded-md border border-line px-4 py-3 text-sm transition-colors hover:border-line-strong hover:bg-surface-sunken"
                  >
                    <span className="font-medium text-ink">
                      {formatMoney(amount, currency, { round: true })}
                    </span>
                    <span className="text-ink-subtle">a month</span>
                  </Link>
                </li>
              ))}
            </ul>

            <ButtonLink href="/give?frequency=monthly" block className="mt-5">
              Choose your own amount
            </ButtonLink>
          </section>

          <section
            aria-labelledby="already-heading"
            className="rounded-lg border border-line bg-surface-sunken p-6"
          >
            <h2 id="already-heading" className="font-serif text-lg font-semibold text-ink">
              Already giving monthly?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Every receipt we send has links to change your amount, update your
              card or stop the gift entirely. If you cannot find one, email{" "}
              <a
                href={`mailto:${siteConfig.legal.email}`}
                className="text-primary underline underline-offset-2"
              >
                {siteConfig.legal.email}
              </a>{" "}
              and we will sort it out.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border-b border-line py-8 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <p className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        <span className="text-accent">{icon}</span>
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-ink lg:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </div>
  );
}

function Item({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="py-5">
      <dt className="font-medium text-ink">{term}</dt>
      <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">{detail}</dd>
    </div>
  );
}
