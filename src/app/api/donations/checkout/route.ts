import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { estimateProcessingFee } from "@/lib/money";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Creates a Stripe Checkout Session for a donation.
 *
 * This endpoint does NOT record a donation. Nothing here writes to the
 * Donation table — that is the webhook's job alone, because a donor who closes
 * the tab after paying must still be recorded, and a donor who reaches the
 * success page without paying must not be.
 */

// Floor of $5: below this, processing fees eat most of the gift and the
// endpoint becomes attractive for card testing. Ceiling of $50,000 to force
// genuinely large gifts through a conversation rather than a web form.
const MIN_AMOUNT_CENTS = 500;
const MAX_AMOUNT_CENTS = 5_000_000;

const CheckoutRequest = z.object({
  amountCents: z.number().int().min(MIN_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS),
  frequency: z.enum(["one_time", "monthly"]),
  /** Campaign slug, or null for the general fund. */
  appealSlug: z.string().min(1).max(120).nullable().optional(),
  coverFee: z.boolean().default(false),
  email: z.email().max(320),
  name: z.string().trim().min(1).max(120).optional(),
  isAnonymous: z.boolean().default(false),
  intention: z.string().trim().max(200).optional(),
  inMemoryOf: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Donations are not yet configured on this deployment." },
      { status: 503 },
    );
  }

  const limit = await checkRateLimit(clientIdentifier(request.headers));
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = CheckoutRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the donation details and try again." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Resolve the appeal server-side. Never trust a client-supplied campaign id,
  // and never accept a gift designated to an appeal that is not open.
  let campaign = null;
  if (input.appealSlug) {
    campaign = await db.campaign.findUnique({
      where: { slug: input.appealSlug },
      select: { id: true, slug: true, title: true, status: true, currency: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "That appeal could not be found." }, { status: 404 });
    }
    if (campaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "That appeal is closed to new donations." },
        { status: 409 },
      );
    }
  }

  const currency = campaign?.currency ?? siteConfig.defaultCurrency;

  // Fee coverage is recomputed here from the validated amount. The client's
  // estimate is display only — it must never determine what we charge.
  const feeTopUp = input.coverFee ? estimateProcessingFee(input.amountCents) : 0;
  const chargeCents = input.amountCents + feeTopUp;

  const stripe = getStripe();
  const baseUrl = siteConfig.url;

  const designation = campaign ? campaign.title : "Where most needed";
  const productName = campaign
    ? `Donation — ${campaign.title}`
    : "Donation — general emergency fund";

  /** Carried through to the webhook, which is where the Donation row is made. */
  const metadata: Record<string, string> = {
    campaignId: campaign?.id ?? "",
    campaignSlug: campaign?.slug ?? "",
    donorEmail: input.email,
    donorName: input.name ?? "",
    isAnonymous: String(input.isAnonymous),
    coverFee: String(input.coverFee),
    intendedAmountCents: String(input.amountCents),
    feeTopUpCents: String(feeTopUp),
    intention: input.intention ?? "",
    inMemoryOf: input.inMemoryOf ?? "",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: input.frequency === "monthly" ? "subscription" : "payment",
      customer_email: input.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: chargeCents,
            product_data: {
              name: productName,
              description: `Designated to: ${designation}`,
            },
            ...(input.frequency === "monthly"
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
        },
      ],
      // Both places matter: subscriptions copy metadata onto each invoice,
      // one-off payments carry it on the payment intent.
      metadata,
      ...(input.frequency === "monthly"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
      success_url: `${baseUrl}/give/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: campaign ? `${baseUrl}/appeals/${campaign.slug}` : `${baseUrl}/give`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Stripe errors can carry cardholder detail; log server-side, return a
    // generic message to the browser.
    console.error("[checkout] Stripe session creation failed", error);
    return NextResponse.json(
      { error: "We could not start the payment. Please try again." },
      { status: 502 },
    );
  }
}
