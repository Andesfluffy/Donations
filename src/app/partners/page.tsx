import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { PARTNER_TYPE_LABELS } from "@/lib/campaign-display";
import { formatMoneyCompact } from "@/lib/money";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our partners",
  description:
    "The organisations that actually deliver the aid your donations fund — who they are, where they work, and how much we have entrusted to each.",
};

export default async function PartnersPage() {
  const partners = await db.partner.findMany({
    orderBy: { name: "asc" },
    include: {
      disbursements: {
        where: { status: { in: ["SENT", "CONFIRMED", "REPORTED"] } },
        select: { amountCents: true, campaignId: true },
      },
    },
  });

  const currency = siteConfig.defaultCurrency;

  return (
    <div className="container-page py-14 md:py-16">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Our partners
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          We do not run our own field operations. We fund Catholic organisations
          already rooted in the communities they serve — a diocesan relief
          office, a religious congregation, a parish network — because they were
          there before the emergency and will be there after it.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Naming them is part of the accountability. Every transfer in our{" "}
          <Link
            href="/transparency/ledger"
            className="text-primary underline underline-offset-2"
          >
            ledger
          </Link>{" "}
          says which of these organisations received it.
        </p>
      </header>

      {partners.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-12 text-center text-ink-muted">
          No partners are published yet.
        </p>
      ) : (
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => {
            // Totals derive from the same disbursement rows the ledger shows.
            const receivedCents = partner.disbursements.reduce(
              (sum, d) => sum + d.amountCents,
              0,
            );
            const campaignCount = new Set(
              partner.disbursements.map((d) => d.campaignId),
            ).size;

            return (
              <li key={partner.id}>
                <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{PARTNER_TYPE_LABELS[partner.type]}</Badge>
                    {partner.vettedAt && (
                      <Badge tone="success">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        Vetted
                      </Badge>
                    )}
                  </div>

                  <h2 className="mt-4 font-serif text-xl leading-snug font-semibold text-ink">
                    <Link
                      href={`/partners/${partner.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {partner.name}
                    </Link>
                  </h2>

                  <p className="mt-1 text-sm text-ink-subtle">{partner.countryName}</p>

                  {partner.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {partner.description}
                    </p>
                  )}

                  <dl className="mt-auto grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
                    <div>
                      <dt className="text-ink-subtle">Received</dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {formatMoneyCompact(receivedCents, currency)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">Appeals</dt>
                      <dd className="mt-0.5 font-medium text-ink">{campaignCount}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
