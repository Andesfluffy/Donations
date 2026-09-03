/**
 * Money helpers. Amounts move through the system as integer minor units
 * (cents/pence) and are only turned into strings at the edge of a render.
 *
 * Nothing here reads the database — this is formatting and arithmetic only.
 * The figures themselves come from `lib/finance.ts`.
 */

/** Currencies whose minor unit is the same as the major unit (no cents). */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

export function toMajorUnits(minor: number | bigint, currency: string): number {
  return Number(minor) / minorUnitFactor(currency);
}

export function toMinorUnits(major: number, currency: string): number {
  return Math.round(major * minorUnitFactor(currency));
}

export interface FormatMoneyOptions {
  /** Drop the fractional part — right for headline totals, wrong for receipts. */
  round?: boolean;
  locale?: string;
}

export function formatMoney(
  minor: number | bigint,
  currency: string,
  { round = false, locale = "en-US" }: FormatMoneyOptions = {},
): string {
  const isZeroDecimal = minorUnitFactor(currency) === 1;
  const digits = round || isZeroDecimal ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajorUnits(minor, currency));
}

/**
 * Compact form for stat tiles — "$1.2M raised". Falls back to the full format
 * below 10,000 so small campaigns do not read as "$0.0K".
 */
export function formatMoneyCompact(
  minor: number | bigint,
  currency: string,
  locale = "en-US",
): string {
  const major = toMajorUnits(minor, currency);
  if (major < 10_000) return formatMoney(minor, currency, { round: true, locale });

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(major);
}

export function formatCount(value: number | bigint, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(Number(value));
}

/**
 * Stripe's standard card pricing, used to show donors what covering the fee
 * would cost before they decide. Authoritative fee figures come back on the
 * balance transaction after the charge settles — this is an estimate for the
 * form only, and is labelled as such in the UI.
 */
export function estimateProcessingFee(
  amountMinor: number,
  { percent = 0.029, fixedMinor = 30 } = {},
): number {
  // Gross up so the fee on the larger charge is still covered:
  //   gross = (amount + fixed) / (1 - percent)
  const gross = Math.ceil((amountMinor + fixedMinor) / (1 - percent));
  return gross - amountMinor;
}

/** Percent of goal reached, clamped so an overfunded appeal cannot exceed 100. */
export function progressPercent(
  raisedMinor: number | bigint,
  goalMinor: number | bigint,
): number {
  const goal = Number(goalMinor);
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (Number(raisedMinor) / goal) * 100));
}
