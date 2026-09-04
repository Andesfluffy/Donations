import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getLedgerEntries, type LedgerFilters } from "@/lib/finance";
import { formatCount, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The full ledger",
  description:
    "Every transfer we have made, across every appeal, with the receiving organisation, the purpose and the supporting documents.",
};

const PAGE_SIZE = 50;

const STATUS_LABELS = {
  PLANNED: "Committed",
  SENT: "Sent",
  CONFIRMED: "Received",
  REPORTED: "Reported on",
} as const;

const STATUS_TONES = {
  PLANNED: "neutral",
  SENT: "primary",
  CONFIRMED: "primary",
  REPORTED: "success",
} as const;

interface LedgerPageProps {
  searchParams: Promise<{
    q?: string;
    appeal?: string;
    partner?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const filters: LedgerFilters = {
    query: params.q?.trim() || undefined,
    campaignSlug: params.appeal || undefined,
    partnerSlug: params.partner || undefined,
    categorySlug: params.category || undefined,
  };

  const [{ entries, total, totalCents }, campaigns, partners, categories] =
    await Promise.all([
      getLedgerEntries(filters, { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      db.campaign.findMany({ select: { slug: true, title: true }, orderBy: { title: "asc" } }),
      db.partner.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
      db.allocationCategory.findMany({
        select: { slug: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Preserve active filters when building the export and pagination links.
  const activeParams = new URLSearchParams();
  if (filters.query) activeParams.set("q", filters.query);
  if (filters.campaignSlug) activeParams.set("appeal", filters.campaignSlug);
  if (filters.partnerSlug) activeParams.set("partner", filters.partnerSlug);
  if (filters.categorySlug) activeParams.set("category", filters.categorySlug);

  const pageHref = (n: number) => {
    const next = new URLSearchParams(activeParams);
    if (n > 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/transparency/ledger?${qs}` : "/transparency/ledger";
  };

  const exportHref = `/api/transparency/ledger${
    activeParams.toString() ? `?${activeParams}` : ""
  }`;

  const currency = entries[0]?.currency ?? "USD";

  return (
    <div className="container-page py-14 md:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/transparency" className="text-ink-subtle hover:text-ink">
          Transparency
        </Link>
        <span className="mx-2 text-ink-subtle" aria-hidden="true">
          /
        </span>
        <span className="text-ink-muted">Ledger</span>
      </nav>

      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          The full ledger
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Every transfer we have made, across every appeal. Committed transfers
          appear here too, labelled as such, so you can see what is promised as
          well as what has moved.
        </p>
      </header>

      {/* One filter row above everything it scopes. Plain GET form, so it works
          without JavaScript and every view is a shareable URL. */}
      <form method="get" className="mt-10 border-y border-line py-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="sr-only">
              Search descriptions, references and partners
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.query ?? ""}
              placeholder="Search description, reference or partner"
              className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            />
          </div>

          <Select
            id="appeal"
            label="Appeal"
            value={filters.campaignSlug}
            options={campaigns.map((c) => ({ value: c.slug, label: c.title }))}
          />
          <Select
            id="partner"
            label="Partner"
            value={filters.partnerSlug}
            options={partners.map((p) => ({ value: p.slug, label: p.name }))}
          />
          <Select
            id="category"
            label="Category"
            value={filters.categorySlug}
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-ink hover:bg-primary-hover"
          >
            Apply filters
          </button>
          <Link
            href="/transparency/ledger"
            className="text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-sm text-ink-muted" aria-live="polite">
          <span className="font-medium text-ink">{formatCount(total)}</span>{" "}
          {total === 1 ? "entry" : "entries"}
          {total > 0 && (
            <>
              {" "}
              totalling{" "}
              <span className="tabular font-medium text-ink">
                {formatMoney(totalCents, currency, { round: true })}
              </span>
            </>
          )}
        </p>

        <ButtonLink href={exportHref} variant="outline" size="sm" prefetch={false}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download CSV
        </ButtonLink>
      </div>

      {entries.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-12 text-center text-ink-muted">
          No entries match these filters.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <caption className="sr-only">
              All disbursements, filterable by appeal, partner and category
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
                  Date
                </th>
                <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
                  Appeal
                </th>
                <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
                  Sent to
                </th>
                <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
                  For
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium text-ink-subtle">
                  Amount
                </th>
                <th scope="col" className="py-3 font-medium text-ink-subtle">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line align-top last:border-0">
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <time dateTime={entry.disbursedAt.toISOString()} className="tabular text-ink">
                      {entry.disbursedAt.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                    {entry.reference && (
                      <span className="mt-1 block text-xs text-ink-subtle">
                        {entry.reference}
                      </span>
                    )}
                  </td>

                  <td className="py-4 pr-4">
                    <Link
                      href={`/appeals/${entry.campaignSlug}`}
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      {entry.campaignTitle}
                    </Link>
                  </td>

                  <td className="py-4 pr-4">
                    <Link
                      href={`/partners/${entry.partnerSlug}`}
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      {entry.partnerName}
                    </Link>
                    <span className="mt-1 block">
                      <Badge tone={STATUS_TONES[entry.status as keyof typeof STATUS_TONES]}>
                        {STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </span>
                  </td>

                  <td className="py-4 pr-4 text-ink-muted">
                    <span className="block font-medium text-ink">{entry.categoryName}</span>
                    <span className="mt-0.5 block max-w-sm">{entry.description}</span>
                    {entry.correctsId && (
                      <span className="mt-1.5 inline-block rounded bg-warning-soft px-1.5 py-0.5 text-xs text-warning">
                        Correction to an earlier entry
                      </span>
                    )}
                  </td>

                  <td className="tabular py-4 pr-4 text-right font-medium whitespace-nowrap text-ink">
                    {formatMoney(entry.amountCents, entry.currency)}
                  </td>

                  <td className="py-4">
                    {entry.documents.length > 0 ? (
                      <ul className="space-y-1">
                        {entry.documents.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={doc.fileUrl}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {doc.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-ink-subtle">Awaiting documentation</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Ledger pages"
          className="mt-10 flex items-center justify-between border-t border-line pt-6"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-sm text-primary hover:text-primary-hover">
              ← Newer
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-ink-subtle">
            Page {page} of {pageCount}
          </span>

          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className="text-sm text-primary hover:text-primary-hover">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  options,
}: {
  id: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={value ?? ""}
        className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
