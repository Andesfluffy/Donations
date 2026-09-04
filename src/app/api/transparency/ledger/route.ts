import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { toCsv } from "@/lib/csv";
import { getLedgerEntries, type LedgerFilters } from "@/lib/finance";
import { toMajorUnits } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * CSV export of the public ledger.
 *
 * The whole point of publishing a ledger is that someone can check it, which
 * means they need it in a tool of their choosing rather than only as a web
 * page. Filters mirror the ledger UI so an export always matches what the
 * reader is looking at.
 */

/** A slug that reaches the query; anything malformed is dropped, not passed on. */
const slug = z
  .string()
  .max(200)
  .regex(/^[a-z0-9-]+$/i)
  .optional()
  .catch(undefined);

const querySchema = z.object({
  q: z.string().max(200).optional().catch(undefined),
  appeal: slug,
  partner: slug,
  category: slug,
});

/** Exports are capped rather than unbounded: the ledger is public, so the
 *  endpoint is unauthenticated and must not become a way to make the database
 *  assemble an arbitrarily large response. */
const MAX_ROWS = 5000;

export async function GET(request: NextRequest) {
  const parsed = querySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  const filters: LedgerFilters = {
    query: parsed.q?.trim() || undefined,
    campaignSlug: parsed.appeal,
    partnerSlug: parsed.partner,
    categorySlug: parsed.category,
  };

  const { entries, total } = await getLedgerEntries(filters, { skip: 0, take: MAX_ROWS });

  const csv = toCsv(
    [
      "Date",
      "Appeal",
      "Partner",
      "Category",
      "Description",
      "Reference",
      "Status",
      "Amount",
      "Currency",
      "Is correction",
      "Documents",
    ],
    entries.map((entry) => [
      entry.disbursedAt.toISOString().slice(0, 10),
      entry.campaignTitle,
      entry.partnerName,
      entry.categoryName,
      entry.description,
      entry.reference ?? "",
      entry.status,
      // Major units with a fixed 2dp: a spreadsheet reader expects 1234.56,
      // not an integer count of cents.
      toMajorUnits(entry.amountCents, entry.currency).toFixed(2),
      entry.currency,
      entry.correctsId ? "yes" : "no",
      entry.documents.map((d) => d.title).join("; "),
    ]),
  );

  const filename = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Financial data: never let an intermediary serve a stale copy.
      "Cache-Control": "no-store",
      // Tell the reader when the export was truncated, rather than silently
      // handing them a partial ledger that looks complete.
      "X-Total-Entries": String(total),
      "X-Exported-Entries": String(entries.length),
    },
  });
}
