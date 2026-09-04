"use client";

import { useOptimistic, useTransition } from "react";
import { Flame } from "lucide-react";

import { recordPrayer } from "@/app/pray/actions";
import { formatCount } from "@/lib/money";

/**
 * "I prayed for this" — an optimistic counter.
 *
 * The count updates immediately rather than waiting for the round trip. If the
 * write fails the optimistic value is discarded on the next render, which is
 * the right trade here: an under-counted prayer is a smaller problem than a
 * button that feels broken.
 */
export function PrayerButton({
  intentionId,
  count,
}: {
  intentionId: string;
  count: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticCount, addOptimistic] = useOptimistic(
    count,
    (current: number, increment: number) => current + increment,
  );

  function handleClick() {
    startTransition(async () => {
      addOptimistic(1);
      await recordPrayer(intentionId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
    >
      <Flame className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      <span>
        {optimisticCount > 0 ? formatCount(optimisticCount) : ""} Prayed
      </span>
      <span className="sr-only">
        for this intention. {formatCount(optimisticCount)} people have prayed for it.
      </span>
    </button>
  );
}
