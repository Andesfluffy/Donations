import { describe, expect, it } from "vitest";

import {
  estimateProcessingFee,
  formatCount,
  formatMoney,
  formatMoneyCompact,
  minorUnitFactor,
  progressPercent,
  toMajorUnits,
  toMinorUnits,
} from "./money";

describe("minor units", () => {
  it("uses 100 subunits for ordinary currencies", () => {
    expect(minorUnitFactor("USD")).toBe(100);
    expect(minorUnitFactor("eur")).toBe(100);
  });

  it("treats zero-decimal currencies as having no subunit", () => {
    // A ¥5000 gift is 5000 minor units, not 500,000 — getting this wrong
    // inflates every yen figure by 100x.
    expect(minorUnitFactor("JPY")).toBe(1);
    expect(minorUnitFactor("xof")).toBe(1);
    expect(toMajorUnits(5000, "JPY")).toBe(5000);
    expect(toMajorUnits(5000, "USD")).toBe(50);
  });

  it("round-trips through minor units without drift", () => {
    for (const amount of [0.01, 1, 19.99, 250.5, 10_000]) {
      expect(toMajorUnits(toMinorUnits(amount, "USD"), "USD")).toBeCloseTo(amount, 10);
    }
  });
});

describe("formatMoney", () => {
  it("renders exact amounts by default", () => {
    expect(formatMoney(5000, "USD")).toBe("$50.00");
    expect(formatMoney(123, "USD")).toBe("$1.23");
  });

  it("drops decimals when rounding for headline figures", () => {
    expect(formatMoney(5000, "USD", { round: true })).toBe("$50");
  });

  it("never shows decimals for zero-decimal currencies", () => {
    expect(formatMoney(5000, "JPY")).not.toContain(".");
  });

  it("accepts bigint aggregates", () => {
    expect(formatMoney(5000n, "USD")).toBe("$50.00");
  });
});

describe("formatMoneyCompact", () => {
  it("compacts large totals", () => {
    expect(formatMoneyCompact(150_000_000, "USD")).toBe("$1.5M");
  });

  it("falls back to full format below 10,000 so nothing reads as $0.0K", () => {
    expect(formatMoneyCompact(500_000, "USD")).toBe("$5,000");
    expect(formatMoneyCompact(4200, "USD")).toBe("$42");
  });
});

describe("estimateProcessingFee", () => {
  it("grosses up so the fee on the larger charge is still covered", () => {
    const amount = 5000;
    const fee = estimateProcessingFee(amount);
    const gross = amount + fee;

    // What Stripe would actually take on the grossed-up charge.
    const actualFee = Math.round(gross * 0.029) + 30;

    // The donation must still net at least the amount the donor intended.
    expect(gross - actualFee).toBeGreaterThanOrEqual(amount);
  });

  it("covers the fee across a wide range of gift sizes", () => {
    for (const amount of [500, 1000, 2500, 10_000, 50_000, 250_000]) {
      const gross = amount + estimateProcessingFee(amount);
      const actualFee = Math.round(gross * 0.029) + 30;
      expect(gross - actualFee).toBeGreaterThanOrEqual(amount);
    }
  });
});

describe("progressPercent", () => {
  it("computes a straightforward ratio", () => {
    expect(progressPercent(5000, 10_000)).toBe(50);
  });

  it("clamps an overfunded appeal to 100", () => {
    expect(progressPercent(20_000, 10_000)).toBe(100);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(progressPercent(100, 0)).toBe(0);
  });

  it("accepts bigint totals from cached aggregates", () => {
    expect(progressPercent(5000n, 10_000n)).toBe(50);
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(12_400)).toBe("12,400");
    expect(formatCount(12_400n)).toBe("12,400");
  });
});
