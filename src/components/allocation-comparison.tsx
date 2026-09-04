import { formatMoney } from "@/lib/money";
import type { CategoryBreakdown } from "@/lib/finance";

/**
 * Promise against delivery, per category.
 *
 * Both bars are always shown even when one is zero — a category we promised
 * and never funded has to be visible, or the comparison flatters us.
 */
export function AllocationComparison({
  breakdown,
  currency,
}: {
  breakdown: CategoryBreakdown[];
  currency: string;
}) {
  if (breakdown.length === 0) return null;

  const anySpend = breakdown.some((row) => row.actualCents > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full bg-line-strong"
            aria-hidden="true"
          />
          Planned
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
          Actually spent
        </span>
      </div>

      <table className="mt-5 w-full border-collapse text-sm">
        <caption className="sr-only">
          Planned allocation compared with funds actually disbursed, by category
        </caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="pb-2 font-medium text-ink-subtle">
              Category
            </th>
            <th scope="col" className="pb-2 font-medium text-ink-subtle">
              <span className="sr-only">Comparison</span>
            </th>
            <th scope="col" className="pb-2 text-right font-medium text-ink-subtle">
              Planned
            </th>
            <th scope="col" className="pb-2 text-right font-medium text-ink-subtle">
              Spent
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row) => (
            <tr key={row.categoryId} className="border-b border-line last:border-0">
              <th scope="row" className="py-3 pr-4 text-left font-normal text-ink">
                {row.name}
                {row.isOverhead && (
                  <span className="ml-2 text-[0.6875rem] uppercase tracking-wide text-ink-subtle">
                    overhead
                  </span>
                )}
              </th>

              <td className="w-1/2 py-3 pr-4">
                <div className="space-y-1">
                  <Bar
                    percent={row.plannedPercent ?? 0}
                    className="bg-line-strong"
                    label={`Planned ${row.plannedPercent ?? 0}%`}
                  />
                  <Bar
                    percent={row.actualPercent}
                    className="bg-primary"
                    label={`Spent ${row.actualPercent.toFixed(1)}%`}
                  />
                </div>
              </td>

              <td className="tabular py-3 text-right text-ink-muted">
                {row.plannedPercent === null ? "—" : `${row.plannedPercent}%`}
              </td>

              <td className="tabular py-3 text-right font-medium text-ink">
                {anySpend ? formatMoney(row.actualCents, currency, { round: true }) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!anySpend && (
        <p className="mt-4 text-sm text-ink-subtle">
          No funds have been disbursed against this appeal yet. Planned
          allocations show how incoming donations are committed.
        </p>
      )}
    </div>
  );
}

function Bar({
  percent,
  className,
  label,
}: {
  percent: number;
  className: string;
  label: string;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      <div
        className={`h-full rounded-full ${className}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        title={label}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
