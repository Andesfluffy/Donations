"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { estimateProcessingFee, formatMoney, toMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface AppealOption {
  slug: string;
  title: string;
  countryName: string;
}

interface DonationFormProps {
  appeals: AppealOption[];
  defaultAppealSlug?: string;
  /** Preselects the frequency, so /monthly can hand off without a second click. */
  defaultFrequency?: Frequency;
  /** Preselects an amount in minor units. Must be one of the presets for the
   *  chosen frequency; the page validates that before passing it. */
  defaultAmountCents?: number;
  currency: string;
  suggestedAmounts: readonly number[];
  suggestedMonthlyAmounts: readonly number[];
  /** Shown as a banner so nobody mistakes a sandbox for the real thing. */
  testMode: boolean;
  configured: boolean;
}

export type Frequency = "one_time" | "monthly";

const GENERAL_FUND = "__general__";

export function DonationForm({
  appeals,
  defaultAppealSlug,
  defaultFrequency = "one_time",
  defaultAmountCents,
  currency,
  suggestedAmounts,
  suggestedMonthlyAmounts,
  testMode,
  configured,
}: DonationFormProps) {
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency);
  // The preset must match the frequency it opens on, or a monthly gift starts
  // preselected at a one-off amount.
  const [presetCents, setPresetCents] = useState<number | null>(
    defaultAmountCents ??
      (defaultFrequency === "monthly" ? suggestedMonthlyAmounts : suggestedAmounts)[1] ??
      null,
  );
  const [customAmount, setCustomAmount] = useState("");
  const [appealSlug, setAppealSlug] = useState(defaultAppealSlug ?? GENERAL_FUND);
  const [coverFee, setCoverFee] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [inMemoryOf, setInMemoryOf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = frequency === "monthly" ? suggestedMonthlyAmounts : suggestedAmounts;

  const amountCents = useMemo(() => {
    if (customAmount.trim() !== "") {
      const parsed = Number.parseFloat(customAmount.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(parsed) || parsed <= 0) return 0;
      return toMinorUnits(parsed, currency);
    }
    return presetCents ?? 0;
  }, [customAmount, presetCents, currency]);

  const feeCents = coverFee && amountCents > 0 ? estimateProcessingFee(amountCents) : 0;
  const totalCents = amountCents + feeCents;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (amountCents < 500) {
      setError("Please enter an amount of at least " + formatMoney(500, currency) + ".");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          frequency,
          appealSlug: appealSlug === GENERAL_FUND ? null : appealSlug,
          coverFee,
          email,
          name: name.trim() || undefined,
          isAnonymous,
          inMemoryOf: inMemoryOf.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("We could not reach the payment service. Please check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {testMode && (
        <p
          role="status"
          className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <strong className="font-semibold">Test mode.</strong> No real payment
          will be taken and no money will move.
        </p>
      )}

      {!configured && (
        <p role="status" className="rounded-md bg-critical-soft px-4 py-3 text-sm text-critical">
          Donations are not yet connected on this deployment, so the button
          below will not complete a payment.
        </p>
      )}

      {/* Frequency ------------------------------------------------------ */}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">How often</legend>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Frequency">
          {(
            [
              ["one_time", "One-off gift"],
              ["monthly", "Every month"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={frequency === value}
              onClick={() => {
                setFrequency(value);
                setPresetCents(
                  (value === "monthly" ? suggestedMonthlyAmounts : suggestedAmounts)[1] ?? null,
                );
                setCustomAmount("");
              }}
              className={cn(
                "rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                frequency === value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {frequency === "monthly" && (
          <p className="mt-2 text-sm text-ink-subtle">
            Monthly gifts let partners commit to staff and supply contracts
            rather than working appeal to appeal. Cancel any time.
          </p>
        )}
      </fieldset>

      {/* Amount --------------------------------------------------------- */}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">How much</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((cents) => {
            const selected = customAmount.trim() === "" && presetCents === cents;
            return (
              <button
                key={cents}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setPresetCents(cents);
                  setCustomAmount("");
                }}
                className={cn(
                  "tabular rounded-md border px-3 py-3 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line text-ink hover:border-line-strong",
                )}
              >
                {formatMoney(cents, currency, { round: true })}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label htmlFor="custom-amount" className="sr-only">
            Other amount
          </label>
          <input
            id="custom-amount"
            type="text"
            inputMode="decimal"
            placeholder="Other amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="tabular w-full rounded-md border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
          />
        </div>
      </fieldset>

      {/* Designation ---------------------------------------------------- */}
      <div>
        <label htmlFor="appeal" className="text-sm font-semibold text-ink">
          Where it goes
        </label>
        <select
          id="appeal"
          value={appealSlug}
          onChange={(e) => setAppealSlug(e.target.value)}
          className="mt-3 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink focus:border-primary focus:outline-none"
        >
          <option value={GENERAL_FUND}>Where the need is greatest</option>
          {appeals.map((appeal) => (
            <option key={appeal.slug} value={appeal.slug}>
              {appeal.title} · {appeal.countryName}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-ink-subtle">
          Undesignated gifts go where partners report the sharpest shortfall —
          often the crises attracting least attention.
        </p>
      </div>

      {/* Details -------------------------------------------------------- */}
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-ink">
            Email <span className="font-normal text-ink-subtle">(for your receipt)</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="name" className="text-sm font-semibold text-ink">
            Name <span className="font-normal text-ink-subtle">(optional)</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="memory" className="text-sm font-semibold text-ink">
            In memory of <span className="font-normal text-ink-subtle">(optional)</span>
          </label>
          <input
            id="memory"
            type="text"
            value={inMemoryOf}
            onChange={(e) => setInMemoryOf(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-primary"
          />
          <span>Do not show my name publicly</span>
        </label>
      </div>

      {/* Fee coverage --------------------------------------------------- */}
      <label className="flex items-start gap-3 rounded-md border border-line bg-surface-sunken p-4 text-sm">
        <input
          type="checkbox"
          checked={coverFee}
          onChange={(e) => setCoverFee(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-primary"
        />
        <span className="text-ink-muted">
          <span className="font-medium text-ink">Cover the processing fee</span>
          {amountCents > 0 && (
            <span className="tabular"> (about {formatMoney(feeCents, currency)})</span>
          )}
          <span className="mt-1 block">
            Card networks take a cut of every gift. Adding it on means the full{" "}
            <span className="tabular">{formatMoney(amountCents || 0, currency)}</span> reaches
            the field. This is an estimate — your receipt shows the exact fee.
          </span>
        </span>
      </label>

      {/* Total and submit ----------------------------------------------- */}
      <div className="border-t border-line pt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">
            {frequency === "monthly" ? "Charged monthly" : "Total today"}
          </span>
          <span className="tabular font-serif text-2xl font-semibold text-ink">
            {formatMoney(totalCents, currency)}
          </span>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-critical-soft px-4 py-3 text-sm text-critical">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" block className="mt-5" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Taking you to checkout…
            </>
          ) : (
            "Continue to secure payment"
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-ink-subtle">
          Payment is handled by Stripe. Card details never touch our servers.
        </p>
      </div>
    </form>
  );
}
