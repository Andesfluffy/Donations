import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

interface ThanksPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ThanksPage({ searchParams }: ThanksPageProps) {
  const { session_id: sessionId } = await searchParams;

  let amountTotal: number | null = null;
  let currency = "USD";
  let designation: string | null = null;
  let receiptRef: string | null = null;
  let paid = false;

  if (sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid" || session.mode === "subscription";
      amountTotal = session.amount_total;
      currency = (session.currency ?? "usd").toUpperCase();

      const campaignSlug = session.metadata?.campaignSlug;
      if (campaignSlug) {
        const campaign = await db.campaign.findUnique({
          where: { slug: campaignSlug },
          select: { title: true },
        });
        designation = campaign?.title ?? null;
      }

      // The webhook is what records the donation, and it may not have landed
      // yet. If it has, we can hand the donor their receipt link right away.
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (paymentIntentId) {
        const donation = await db.donation.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
          select: { publicRef: true },
        });
        receiptRef = donation?.publicRef ?? null;
      }
    } catch {
      // A bad or expired session id should not produce an error page — the
      // payment may well have succeeded regardless.
    }
  }

  return (
    <div className="container-page py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <div className="season-rule mx-auto w-16" aria-hidden="true" />

        <h1 className="mt-8 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Thank you
        </h1>

        {amountTotal !== null && paid ? (
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Your gift of{" "}
            <span className="tabular font-semibold text-ink">
              {formatMoney(amountTotal, currency)}
            </span>
            {designation ? (
              <>
                {" "}
                to <span className="font-semibold text-ink">{designation}</span>
              </>
            ) : (
              " to the general emergency fund"
            )}{" "}
            has been received.
          </p>
        ) : (
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Your gift has been received. A receipt is on its way to your email.
          </p>
        )}

        <p className="mt-4 text-ink-muted">
          A receipt is on its way by email. When we transfer these funds to our
          partner, the transfer will appear on the appeal&rsquo;s public ledger
          with the date, the amount and the documentation behind it.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          {receiptRef ? (
            <ButtonLink href={`/give/receipt/${receiptRef}`} size="lg">
              View your receipt
            </ButtonLink>
          ) : (
            <ButtonLink href="/transparency" size="lg">
              See where funds go
            </ButtonLink>
          )}
          <ButtonLink href="/appeals" variant="outline" size="lg">
            Back to appeals
          </ButtonLink>
        </div>

        {!receiptRef && sessionId && (
          <p className="mt-8 text-sm text-ink-subtle">
            Your receipt link will arrive by email within a few minutes.
          </p>
        )}

        <p className="mt-12 border-t border-line pt-8 text-sm text-ink-subtle">
          If anything looks wrong, write to us and we will correct it —{" "}
          <Link href="/about#contact" className="text-primary underline underline-offset-2">
            get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
