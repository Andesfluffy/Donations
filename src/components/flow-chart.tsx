"use client";

import { useState } from "react";

import { formatMoney, formatMoneyCompact } from "@/lib/money";

export interface FlowPoint {
  monthISO: string;
  raisedCents: number;
  disbursedCents: number;
}

interface FlowChartProps {
  data: FlowPoint[];
  currency: string;
}

const PLOT_HEIGHT = 200;

/**
 * Money received against money delivered, by month.
 *
 * Both series are the same measure in the same unit, so they share one axis —
 * a second y-scale would invent a relationship the data does not contain.
 * The question this answers, which a breakdown by category cannot: are funds
 * actually moving, or accumulating?
 *
 * Built from HTML rather than a stretched SVG: a viewBox scaled with
 * `preserveAspectRatio="none"` distorts rounded corners and bar widths, and a
 * charting library would be a large dependency for two series of twelve bars.
 *
 * Colours come from the validated --chart-1/--chart-2 tokens, not the UI
 * primary/accent — the deep Marian blue falls outside the usable lightness
 * band as a data mark and reads gray.
 */
export function FlowChart({ data, currency }: FlowChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => Math.max(d.raisedCents, d.disbursedCents)));

  // Round the axis top to something legible rather than the raw maximum.
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const axisMax = Math.ceil(max / magnitude) * magnitude;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => t * axisMax);

  const monthLabel = (iso: string, long = false) =>
    new Date(iso).toLocaleDateString("en-GB", {
      month: long ? "long" : "short",
      year: long ? "numeric" : "2-digit",
      timeZone: "UTC",
    });

  const active = hovered !== null ? data[hovered] : null;

  return (
    <figure className="m-0">
      {/* Legend, always present for two series — identity is never carried by
          colour alone. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-1" aria-hidden="true" />
          Received
        </span>
        <span className="inline-flex items-center gap-2 text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-2" aria-hidden="true" />
          Delivered to partners
        </span>
      </div>

      <div className="relative mt-5">
        {/* Tooltip enhances, never gates: every value is also in the table
            below and reachable by keyboard focus. */}
        {active && (
          <div
            role="status"
            className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-md border border-line bg-surface-raised px-3 py-2 text-xs shadow-md"
          >
            <p className="font-medium text-ink">{monthLabel(active.monthISO, true)}</p>
            <p className="mt-1 text-ink-muted">
              Received{" "}
              <span className="font-medium text-ink">
                {formatMoney(active.raisedCents, currency, { round: true })}
              </span>
            </p>
            <p className="text-ink-muted">
              Delivered{" "}
              <span className="font-medium text-ink">
                {formatMoney(active.disbursedCents, currency, { round: true })}
              </span>
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {/* Y axis. Tabular figures because these ticks align vertically. */}
          <div
            className="tabular flex shrink-0 flex-col justify-between text-right text-[0.6875rem] text-ink-subtle"
            style={{ height: PLOT_HEIGHT }}
            aria-hidden="true"
          >
            {ticks.map((tick) => (
              <span key={tick}>{formatMoneyCompact(tick, currency)}</span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: PLOT_HEIGHT }}>
              {/* Solid hairline grid, one shade off the surface. Never dashed. */}
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute inset-x-0 border-t border-chart-grid"
                  style={{ top: `${(1 - tick / axisMax) * 100}%` }}
                  aria-hidden="true"
                />
              ))}

              <div className="absolute inset-0 flex items-end">
                {data.map((point, index) => (
                  <div
                    key={point.monthISO}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${monthLabel(point.monthISO, true)}: received ${formatMoney(
                      point.raisedCents,
                      currency,
                      { round: true },
                    )}, delivered ${formatMoney(point.disbursedCents, currency, {
                      round: true,
                    })}`}
                  >
                    {/* Full-column hover band, so the hit target is the whole
                        month rather than the thin marks. */}
                    <span
                      className={`pointer-events-none absolute inset-0 bg-chart-grid transition-opacity ${
                        hovered === index ? "opacity-40" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />

                    {/* Thin marks with rounded data-ends anchored to the
                        baseline; the 2px gap separates the pair without a
                        border around either. */}
                    <span
                      className="relative w-[30%] max-w-3 rounded-t-[4px] bg-chart-1"
                      style={{ height: `${(point.raisedCents / axisMax) * 100}%` }}
                      aria-hidden="true"
                    />
                    <span
                      className="relative w-[30%] max-w-3 rounded-t-[4px] bg-chart-2"
                      style={{ height: `${(point.disbursedCents / axisMax) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* X axis sits in the flow rather than a fixed-height box, so the
                labels cannot be clipped by the container. Every other label is
                hidden to stop collisions on narrow screens. */}
            <div className="mt-2 flex text-[0.6875rem] text-ink-subtle">
              {data.map((point, index) => (
                <span
                  key={point.monthISO}
                  className={`min-w-0 flex-1 text-center ${
                    index % 2 === 0 ? "" : "invisible"
                  }`}
                >
                  {monthLabel(point.monthISO)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The table twin. Every value readable without colour or hover. */}
      <details className="mt-6 rounded-md border border-line bg-surface-sunken">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
          View as a table
        </summary>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <caption className="sr-only">Monthly funds received and delivered</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="py-2 font-medium text-ink-subtle">
                  Month
                </th>
                <th scope="col" className="py-2 text-right font-medium text-ink-subtle">
                  Received
                </th>
                <th scope="col" className="py-2 text-right font-medium text-ink-subtle">
                  Delivered
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.monthISO} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 text-left font-normal text-ink">
                    {monthLabel(point.monthISO, true)}
                  </th>
                  <td className="tabular py-2 text-right text-ink">
                    {formatMoney(point.raisedCents, currency, { round: true })}
                  </td>
                  <td className="tabular py-2 text-right text-ink">
                    {formatMoney(point.disbursedCents, currency, { round: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
