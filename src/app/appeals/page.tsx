import type { Metadata } from "next";
import Link from "next/link";

import { AppealCard, type AppealCardData } from "@/components/appeal-card";
import { db } from "@/lib/db";
import { CRISIS_TYPE_LABELS } from "@/lib/campaign-display";
import type { CrisisType, Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Current appeals",
  description:
    "Every open emergency appeal, each funding a named partner working inside the affected community.",
};

const CRISIS_TYPES = Object.keys(CRISIS_TYPE_LABELS) as CrisisType[];

interface AppealsPageProps {
  searchParams: Promise<{ type?: string; country?: string }>;
}

export default async function AppealsPage({ searchParams }: AppealsPageProps) {
  const params = await searchParams;

  // Only accept a filter value that is actually a member of the enum —
  // anything else is ignored rather than passed to the query.
  const activeType = CRISIS_TYPES.includes(params.type as CrisisType)
    ? (params.type as CrisisType)
    : undefined;
  const activeCountry = params.country?.slice(0, 2).toUpperCase();

  const where: Prisma.CampaignWhereInput = {
    status: "ACTIVE",
    ...(activeType ? { crisisType: activeType } : {}),
    ...(activeCountry ? { countryCode: activeCountry } : {}),
  };

  const [campaigns, countries] = await Promise.all([
    db.campaign.findMany({
      where,
      orderBy: [{ urgency: "asc" }, { startedAt: "desc" }],
      include: { financials: true },
    }),
    db.campaign.findMany({
      where: { status: "ACTIVE" },
      distinct: ["countryCode"],
      select: { countryCode: true, countryName: true },
      orderBy: { countryName: "asc" },
    }),
  ]);

  const appeals: AppealCardData[] = campaigns.map((campaign) => ({
    slug: campaign.slug,
    title: campaign.title,
    summary: campaign.summary,
    countryName: campaign.countryName,
    crisisType: campaign.crisisType,
    urgency: campaign.urgency,
    goalCents: campaign.goalCents,
    currency: campaign.currency,
    coverImageUrl: campaign.coverImageUrl,
    coverImageAlt: campaign.coverImageAlt,
    raisedCents: Number(campaign.financials?.raisedCents ?? 0n),
  }));

  // Only offer filters that exist in the current data, so a reader cannot
  // select a facet that returns nothing.
  const availableTypes = [...new Set(campaigns.map((c) => c.crisisType))];

  return (
    <div className="container-page py-16 md:py-20">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Current appeals
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Each appeal funds a named partner already working inside the affected
          community, and publishes a dated record of every transfer made.
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-4 border-y border-line py-5">
        <FilterRow
          label="Crisis"
          activeValue={activeType}
          allHref="/appeals"
          options={(activeType ? CRISIS_TYPES : availableTypes).map((type) => ({
            value: type,
            label: CRISIS_TYPE_LABELS[type],
            href: `/appeals?type=${type}`,
          }))}
        />
        <FilterRow
          label="Country"
          activeValue={activeCountry}
          allHref="/appeals"
          options={countries.map((c) => ({
            value: c.countryCode,
            label: c.countryName,
            href: `/appeals?country=${c.countryCode}`,
          }))}
        />
      </div>

      <p className="mt-6 text-sm text-ink-subtle" aria-live="polite">
        {appeals.length} {appeals.length === 1 ? "appeal" : "appeals"}
      </p>

      {appeals.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {appeals.map((appeal) => (
            <AppealCard key={appeal.slug} appeal={appeal} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-12 text-center">
          <p className="text-ink-muted">No appeals match this filter.</p>
          <Link
            href="/appeals"
            className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary-hover"
          >
            Show all appeals
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  options,
  activeValue,
  allHref,
}: {
  label: string;
  options: { value: string; label: string; href: string }[];
  activeValue?: string;
  allHref: string;
}) {
  if (options.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </span>

      <FilterChip href={allHref} active={!activeValue}>
        All
      </FilterChip>

      {options.map((option) => (
        <FilterChip key={option.value} href={option.href} active={activeValue === option.value}>
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-ink"
          : "rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}
