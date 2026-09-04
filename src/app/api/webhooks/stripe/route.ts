import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { recomputeCampaignFinancials } from "@/lib/finance";
import { getStripe } from "@/lib/stripe";

/**
 * The only place in this codebase that creates a Donation row.
 *
 * Why not the success redirect: donors close the tab, lose signal, or get
 * bounced through 3-D Secure. Reaching the redirect is neither necessary nor
 * sufficient evidence that money moved. Stripe's webhook is.
 *
 * Two rules govern everything below:
 *   1. Every event is recorded in StripeEvent before it is acted on. Stripe
 *      retries on any non-2xx, and a retry must never double-count money.
 *   2. Recurring gifts are counted from invoice.paid only. A subscription
 *      checkout fires BOTH checkout.session.completed and invoice.paid; taking
 *      both would book the first month twice.
 */

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Stripe signs the raw bytes, so the body must not be parsed before checking.
  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    // An invalid signature means the request did not come from Stripe.
    console.error("[stripe-webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency gate. The primary-key constraint is what makes this safe when
  // two retries arrive concurrently: the second insert throws instead of
  // proceeding into the handler.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, stripe);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, stripe);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Unhandled types are still recorded above so Stripe stops redelivering.
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] handler failed for ${event.type}`, error);

    // Release the idempotency record so Stripe's retry can succeed. Without
    // this, one transient database error silently loses a donation forever.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});

    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

/**
 * Short, unguessable receipt reference. Deliberately not sequential: donation
 * volume should not be inferable from a receipt link.
 */
function publicRef(): string {
  return randomBytes(9).toString("base64url");
}

async function upsertDonor(email: string, name: string | null, customerId: string | null) {
  return db.donor.upsert({
    where: { email },
    create: { email, name: name || null, stripeCustomerId: customerId },
    // Never blank out a stored name or customer id with an empty later value.
    update: {
      ...(name ? { name } : {}),
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
  });
}

/**
 * The authoritative processing fee, read from the balance transaction rather
 * than estimated. The donation form shows an estimate; the ledger records what
 * Stripe actually took.
 */
async function resolveFeeCents(stripe: Stripe, chargeId: string | null): Promise<number> {
  if (!chargeId) return 0;

  try {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });
    const balanceTransaction = charge.balance_transaction;

    if (balanceTransaction && typeof balanceTransaction !== "string") {
      return balanceTransaction.fee;
    }
  } catch (error) {
    // A missing fee must not block recording the gift. Net is corrected on the
    // next reconciliation rather than dropping the donation entirely.
    console.error("[stripe-webhook] could not resolve balance transaction", error);
  }

  return 0;
}

function metadataOf(source: { metadata?: Stripe.Metadata | null }): Record<string, string> {
  return (source.metadata ?? {}) as Record<string, string>;
}

async function recordDonation(params: {
  email: string;
  name: string | null;
  customerId: string | null;
  campaignId: string | null;
  amountCents: number;
  feeCents: number;
  currency: string;
  type: "ONE_TIME" | "RECURRING";
  paymentIntentId: string | null;
  subscriptionId: string | null;
  chargeId: string | null;
  metadata: Record<string, string>;
}) {
  const donor = await upsertDonor(params.email, params.name, params.customerId);

  // A campaign closed or removed between checkout and webhook must not lose
  // the gift; it falls back to the general fund rather than failing the insert.
  const campaign = params.campaignId
    ? await db.campaign.findUnique({
        where: { id: params.campaignId },
        select: { id: true },
      })
    : null;

  await db.donation.create({
    data: {
      donorId: donor.id,
      campaignId: campaign?.id ?? null,
      amountCents: params.amountCents,
      feeCents: params.feeCents,
      netCents: params.amountCents - params.feeCents,
      currency: params.currency.toUpperCase(),
      feeCovered: params.metadata.coverFee === "true",
      type: params.type,
      status: "SUCCEEDED",
      stripePaymentIntentId: params.paymentIntentId,
      stripeSubscriptionId: params.subscriptionId,
      stripeChargeId: params.chargeId,
      publicRef: publicRef(),
      isAnonymous: params.metadata.isAnonymous === "true",
      intention: params.metadata.intention || null,
      inMemoryOf: params.metadata.inMemoryOf || null,
    },
  });

  if (campaign) {
    await recomputeCampaignFinancials(campaign.id);
  }
}

// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  // Recurring gifts are booked from invoice.paid. Counting them here as well
  // would record the first month twice.
  if (session.mode === "subscription") return;
  if (session.payment_status !== "paid") return;

  const metadata = metadataOf(session);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  let chargeId: string | null = null;
  if (paymentIntentId) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : (intent.latest_charge?.id ?? null);
  }

  const feeCents = await resolveFeeCents(stripe, chargeId);

  const email =
    session.customer_details?.email ?? session.customer_email ?? metadata.donorEmail;
  if (!email) {
    throw new Error(`checkout.session.completed ${session.id} has no email to attribute`);
  }

  await recordDonation({
    email,
    name: session.customer_details?.name ?? metadata.donorName ?? null,
    customerId: typeof session.customer === "string" ? session.customer : null,
    campaignId: metadata.campaignId || null,
    amountCents: session.amount_total ?? 0,
    feeCents,
    currency: session.currency ?? "usd",
    type: "ONE_TIME",
    paymentIntentId,
    subscriptionId: null,
    chargeId,
    metadata,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionDetails = invoice.parent?.subscription_details;
  const subscription = subscriptionDetails?.subscription;
  const subscriptionId =
    typeof subscription === "string" ? subscription : (subscription?.id ?? null);

  // Only subscription invoices; one-off payments are handled at checkout.
  if (!subscriptionId) return;
  if (invoice.amount_paid <= 0) return;

  // Subscription metadata is copied onto every invoice it generates, which is
  // how a recurring gift keeps its designation month after month. Invoice-level
  // metadata wins if both are set.
  const metadata: Record<string, string> = {
    ...((subscriptionDetails?.metadata ?? {}) as Record<string, string>),
    ...metadataOf(invoice),
  };

  const chargeId = await resolveInvoiceChargeId(stripe, invoice);
  const feeCents = await resolveFeeCents(stripe, chargeId);

  const email = invoice.customer_email ?? metadata.donorEmail;
  if (!email) {
    throw new Error(`invoice.paid ${invoice.id} has no email to attribute`);
  }

  await recordDonation({
    email,
    name: invoice.customer_name ?? metadata.donorName ?? null,
    customerId: typeof invoice.customer === "string" ? invoice.customer : null,
    campaignId: metadata.campaignId || null,
    amountCents: invoice.amount_paid,
    feeCents,
    currency: invoice.currency,
    type: "RECURRING",
    paymentIntentId: null,
    subscriptionId,
    chargeId,
    metadata,
  });
}

/**
 * Finds the charge behind a paid invoice.
 *
 * `invoice.charge` was removed from the API — invoices now carry an
 * `payments` list, each entry pointing at a PaymentIntent (or, for older
 * charges without one, a charge directly). The list is not always inlined on
 * the webhook payload, so fall back to fetching it.
 */
async function resolveInvoiceChargeId(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<string | null> {
  let payments = invoice.payments?.data;

  if ((!payments || payments.length === 0) && invoice.id) {
    try {
      const listed = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 10 });
      payments = listed.data;
    } catch (error) {
      console.error("[stripe-webhook] could not list invoice payments", error);
      return null;
    }
  }

  const paid = payments?.find((entry) => entry.status === "paid") ?? payments?.[0];
  const payment = paid?.payment;
  if (!payment) return null;

  if (payment.charge) {
    return typeof payment.charge === "string" ? payment.charge : payment.charge.id;
  }

  if (payment.payment_intent) {
    const intentId =
      typeof payment.payment_intent === "string"
        ? payment.payment_intent
        : payment.payment_intent.id;

    try {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      return typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : (intent.latest_charge?.id ?? null);
    } catch (error) {
      console.error("[stripe-webhook] could not retrieve payment intent", error);
    }
  }

  return null;
}

/**
 * Refunds mark the donation REFUNDED rather than deleting it. The gift did
 * happen; the ledger says so, and the totals stop counting it.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const donation = await db.donation.findFirst({
    where: { stripeChargeId: charge.id },
    select: { id: true, campaignId: true },
  });

  if (!donation) return;

  await db.donation.update({
    where: { id: donation.id },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });

  if (donation.campaignId) {
    await recomputeCampaignFinancials(donation.campaignId);
  }
}
