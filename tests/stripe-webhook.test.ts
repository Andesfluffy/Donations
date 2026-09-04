import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Webhook behaviour tests.
 *
 * These are the highest-consequence paths in the codebase: a bug here either
 * loses someone's donation or counts it twice. They run against the local
 * database and skip themselves when one is not configured.
 *
 * Stripe itself is stubbed — signature verification is replaced with a
 * pass-through so we can feed constructed events, and the retrieve calls
 * return fixed fee data rather than hitting the network.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Whatever the current test wants constructEvent to return. */
let nextEvent: Stripe.Event;

const stripeStub = {
  webhooks: {
    constructEvent: vi.fn(() => nextEvent),
  },
  paymentIntents: {
    retrieve: vi.fn(async () => ({ latest_charge: "ch_test_123" })),
  },
  charges: {
    retrieve: vi.fn(async () => ({
      balance_transaction: { fee: 175 },
    })),
  },
  invoicePayments: {
    list: vi.fn(async () => ({
      data: [{ status: "paid", payment: { payment_intent: "pi_test_sub" } }],
    })),
  },
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => stripeStub,
  isStripeConfigured: () => true,
  isStripeTestMode: () => true,
}));

process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_test_placeholder";

const { POST } = await import("@/app/api/webhooks/stripe/route");
const { db } = await import("@/lib/db");

function post(body: string = "{}") {
  return POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=stub" },
      body,
    }),
  );
}

const TEST_EMAIL = "webhook.test.donor@example.invalid";

function checkoutEvent(id: string, overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        mode: "payment",
        payment_status: "paid",
        amount_total: 10_000,
        currency: "usd",
        customer: "cus_test_1",
        customer_email: TEST_EMAIL,
        customer_details: { email: TEST_EMAIL, name: "Test Donor" },
        payment_intent: "pi_test_1",
        metadata: { coverFee: "true", isAnonymous: "false" },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

function invoiceEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "invoice.paid",
    data: {
      object: {
        id: "in_test_1",
        amount_paid: 2_500,
        currency: "usd",
        customer: "cus_test_1",
        customer_email: TEST_EMAIL,
        customer_name: "Test Donor",
        parent: {
          subscription_details: {
            subscription: "sub_test_1",
            metadata: { isAnonymous: "false" },
          },
        },
        payments: { data: [{ status: "paid", payment: { charge: "ch_test_123" } }] },
        metadata: {},
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

async function cleanup() {
  const donor = await db.donor.findUnique({ where: { email: TEST_EMAIL } });
  if (donor) {
    await db.donation.deleteMany({ where: { donorId: donor.id } });
    await db.donor.delete({ where: { id: donor.id } });
  }
  await db.stripeEvent.deleteMany({ where: { id: { startsWith: "evt_test_" } } });
}

async function donationCount() {
  const donor = await db.donor.findUnique({ where: { email: TEST_EMAIL } });
  if (!donor) return 0;
  return db.donation.count({ where: { donorId: donor.id } });
}

describe.skipIf(!hasDatabase)("Stripe webhook", () => {
  beforeEach(async () => {
    await cleanup();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("records a one-off donation from checkout.session.completed", async () => {
    nextEvent = checkoutEvent("evt_test_one_off");
    const response = await post();

    expect(response.status).toBe(200);
    expect(await donationCount()).toBe(1);

    const donation = await db.donation.findFirst({
      where: { stripePaymentIntentId: "pi_test_1" },
    });

    expect(donation).not.toBeNull();
    expect(donation!.amountCents).toBe(10_000);
    expect(donation!.type).toBe("ONE_TIME");
    expect(donation!.status).toBe("SUCCEEDED");
    // Fee comes from the balance transaction, not the client's estimate.
    expect(donation!.feeCents).toBe(175);
    expect(donation!.netCents).toBe(10_000 - 175);
    expect(donation!.feeCovered).toBe(true);
    expect(donation!.publicRef).toBeTruthy();
  });

  it("ignores a replay of the same event id", async () => {
    nextEvent = checkoutEvent("evt_test_replay");

    const first = await post();
    const second = await post();
    const third = await post();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect(third.status).toBe(200);

    // Stripe retries aggressively; three deliveries must still be one gift.
    expect(await donationCount()).toBe(1);
  });

  it("does not record a subscription checkout, which invoice.paid will book", async () => {
    // Both events fire for a subscription. Booking here as well would charge
    // the donor once but credit them twice.
    nextEvent = checkoutEvent("evt_test_sub_checkout", { mode: "subscription" });
    const response = await post();

    expect(response.status).toBe(200);
    expect(await donationCount()).toBe(0);
  });

  it("ignores an unpaid checkout session", async () => {
    nextEvent = checkoutEvent("evt_test_unpaid", { payment_status: "unpaid" });
    await post();

    expect(await donationCount()).toBe(0);
  });

  it("records a recurring donation from invoice.paid", async () => {
    nextEvent = invoiceEvent("evt_test_invoice");
    const response = await post();

    expect(response.status).toBe(200);

    const donation = await db.donation.findFirst({
      where: { stripeSubscriptionId: "sub_test_1" },
    });

    expect(donation).not.toBeNull();
    expect(donation!.type).toBe("RECURRING");
    expect(donation!.amountCents).toBe(2_500);
    expect(donation!.feeCents).toBe(175);
  });

  it("ignores an invoice with no subscription behind it", async () => {
    nextEvent = invoiceEvent("evt_test_no_sub", { parent: null });
    await post();

    expect(await donationCount()).toBe(0);
  });

  it("ignores a zero-amount invoice", async () => {
    nextEvent = invoiceEvent("evt_test_zero", { amount_paid: 0 });
    await post();

    expect(await donationCount()).toBe(0);
  });

  it("rejects a request with no signature header", async () => {
    nextEvent = checkoutEvent("evt_test_nosig");

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(400);
    expect(await donationCount()).toBe(0);
  });

  it("rejects an event whose signature does not verify", async () => {
    stripeStub.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const response = await post();

    expect(response.status).toBe(400);
    expect(await donationCount()).toBe(0);
  });

  it("releases the idempotency record when a handler fails, so Stripe can retry", async () => {
    // A transient failure must not permanently swallow the donation: the
    // event id has to be free for the retry to get through.
    stripeStub.paymentIntents.retrieve.mockRejectedValueOnce(new Error("network blip"));

    nextEvent = checkoutEvent("evt_test_retry");
    const failed = await post();
    expect(failed.status).toBe(500);

    const stored = await db.stripeEvent.findUnique({ where: { id: "evt_test_retry" } });
    expect(stored).toBeNull();

    // The retry now succeeds and the gift is recorded exactly once.
    const retried = await post();
    expect(retried.status).toBe(200);
    expect(await donationCount()).toBe(1);
  });

  it("marks a refunded donation without deleting it", async () => {
    nextEvent = checkoutEvent("evt_test_to_refund");
    await post();

    nextEvent = {
      id: "evt_test_refund",
      type: "charge.refunded",
      data: { object: { id: "ch_test_123" } },
    } as unknown as Stripe.Event;

    const response = await post();
    expect(response.status).toBe(200);

    const donation = await db.donation.findFirst({
      where: { stripeChargeId: "ch_test_123" },
    });

    // The gift happened; the ledger keeps saying so, it just stops counting.
    expect(donation).not.toBeNull();
    expect(donation!.status).toBe("REFUNDED");
    expect(donation!.refundedAt).not.toBeNull();
  });
});
