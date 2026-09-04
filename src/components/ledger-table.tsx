import Link from "next/link";
import { FileText, Image as ImageIcon, Receipt, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { DisbursementStatus, DocumentType } from "@/generated/prisma";

export interface LedgerRow {
  id: string;
  disbursedAt: Date;
  amountCents: number;
  currency: string;
  description: string;
  reference: string | null;
  status: DisbursementStatus;
  categoryName: string;
  partnerName: string;
  partnerSlug: string;
  /** Set when this row corrects an earlier one. */
  correctsId: string | null;
  documents: { id: string; type: DocumentType; title: string; fileUrl: string }[];
}

const STATUS_LABELS: Record<DisbursementStatus, string> = {
  PLANNED: "Committed",
  SENT: "Sent",
  CONFIRMED: "Received",
  REPORTED: "Reported on",
};

const STATUS_TONES = {
  PLANNED: "neutral",
  SENT: "primary",
  CONFIRMED: "primary",
  REPORTED: "success",
} as const satisfies Record<DisbursementStatus, "neutral" | "primary" | "success">;

const DOC_ICONS: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
  RECEIPT: Receipt,
  INVOICE: Receipt,
  FIELD_REPORT: ScrollText,
  PHOTO: ImageIcon,
  AUDIT: FileText,
  AGREEMENT: FileText,
};

/**
 * The disbursement ledger for one appeal.
 *
 * Rows are never edited, so a correction appears as its own entry marked as
 * such, sitting beside the original. Showing the mistake is the point.
 */
export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-10 text-center text-ink-muted">
        No funds have left for this appeal yet. Entries appear here the day a
        transfer is made.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="sr-only">
          Every transfer made against this appeal, with supporting documents
        </caption>
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th scope="col" className="py-3 pr-4 font-medium text-ink-subtle">
              Date
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line align-top last:border-0">
              <td className="py-4 pr-4 whitespace-nowrap">
                <time dateTime={row.disbursedAt.toISOString()} className="tabular text-ink">
                  {row.disbursedAt.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                {row.reference && (
                  <span className="mt-1 block text-xs text-ink-subtle">{row.reference}</span>
                )}
              </td>

              <td className="py-4 pr-4">
                <Link
                  href={`/partners/${row.partnerSlug}`}
                  className="text-ink underline-offset-2 hover:underline"
                >
                  {row.partnerName}
                </Link>
                <span className="mt-1 block">
                  <Badge tone={STATUS_TONES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                </span>
              </td>

              <td className="py-4 pr-4 text-ink-muted">
                <span className="block font-medium text-ink">{row.categoryName}</span>
                <span className="mt-0.5 block max-w-md">{row.description}</span>
                {row.correctsId && (
                  <span className="mt-1.5 inline-block rounded bg-warning-soft px-1.5 py-0.5 text-xs text-warning">
                    Correction to an earlier entry
                  </span>
                )}
              </td>

              <td className="tabular py-4 pr-4 text-right font-medium text-ink whitespace-nowrap">
                {formatMoney(row.amountCents, row.currency)}
              </td>

              <td className="py-4">
                {row.documents.length > 0 ? (
                  <ul className="space-y-1.5">
                    {row.documents.map((doc) => {
                      const Icon = DOC_ICONS[doc.type];
                      return (
                        <li key={doc.id}>
                          <a
                            href={doc.fileUrl}
                            className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{doc.title}</span>
                          </a>
                        </li>
                      );
                    })}
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
  );
}
