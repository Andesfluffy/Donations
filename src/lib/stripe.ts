import Stripe from "stripe";

/**
 * Server-side Stripe client.
 *
 * The API version is pinned explicitly rather than inheriting the account
 * default: a dashboard-level version bump should never silently change how
 * money is processed here. It matches the version this SDK was generated
 * against, so the types are accurate.
 */
const API_VERSION = "2026-08-26.dahlia" as const;

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set — copy .env.example to .env.local");
  }

  cached = new Stripe(key, {
    apiVersion: API_VERSION,
    typescript: true,
    appInfo: { name: "Catholic Crisis Relief" },
  });

  return cached;
}

/** True when running against test keys. Used to badge the donation form so
 *  nobody mistakes a sandbox for the real thing. */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
