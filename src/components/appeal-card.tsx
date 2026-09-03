import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CRISIS_TYPE_LABELS, URGENCY_LABELS, URGENCY_TONES } from "@/lib/campaign-display";
import { formatMoneyCompact, progressPercent } from "@/lib/money";
import type { CrisisType, Urgency } from "@/generated/prisma";

export interface AppealCardData {
  slug: string;
  title: string;
  summary: string;
  countryName: string;
  crisisType: CrisisType;
  urgency: Urgency;
  goalCents: number;
  currency: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  raisedCents: number;
}

export function AppealCard({ appeal }: { appeal: AppealCardData }) {
  const percent = progressPercent(appeal.raisedCents, appeal.goalCents);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
        {appeal.coverImageUrl ? (
          <Image
            src={appeal.coverImageUrl}
            // Alt text is authored per campaign. Dignity policy: describe the
            // people and what they are doing, never "a suffering victim".
            alt={appeal.coverImageAlt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge tone={URGENCY_TONES[appeal.urgency]}>{URGENCY_LABELS[appeal.urgency]}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
          {appeal.countryName} · {CRISIS_TYPE_LABELS[appeal.crisisType]}
        </p>

        <h3 className="mt-2 font-serif text-xl leading-snug font-semibold text-ink">
          {/* Stretched link keeps the whole card clickable while leaving one
              real link for screen readers and keyboard users. */}
          <Link href={`/appeals/${appeal.slug}`} className="after:absolute after:inset-0">
            {appeal.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
          {appeal.summary}
        </p>

        {/* mt-auto keeps the progress bar on the card's baseline so a row of
            cards with different summary lengths still aligns. */}
        <div className="mt-auto pt-5">
          <Progress value={percent} label={`${Math.round(percent)}% of goal raised`} />
          <div className="mt-2.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="tabular font-semibold text-ink">
              {formatMoneyCompact(appeal.raisedCents, appeal.currency)}
            </span>
            <span className="tabular text-ink-subtle">
              of {formatMoneyCompact(appeal.goalCents, appeal.currency)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
