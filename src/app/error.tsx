"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * The wording matters more than usual here. Most of this site's pages render
 * live financial totals, so a reader who hits an error on one of them needs to
 * be told that they are seeing *nothing* rather than something incomplete — a
 * half-rendered total would be exactly the kind of quiet inaccuracy the ledger
 * exists to rule out.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side causes are already logged with a digest; this records the
    // client-side view of the same failure.
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center py-20">
      <div className="max-w-xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-critical">
          Something went wrong
        </p>

        <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          We couldn&rsquo;t load this page
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          This is a fault at our end, not a problem with your donation. Nothing
          you see below a failed load should be treated as a total — reload
          before reading any figure from this page.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" size="lg">
            Back to the home page
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="mt-8 border-t border-line pt-5 text-sm text-ink-subtle">
            If you contact us about this, quoting this reference helps us find
            it: <code className="tabular font-medium text-ink-muted">{error.digest}</code>
          </p>
        )}

        <p className="mt-6 text-sm text-ink-muted">
          Trying to give?{" "}
          <Link
            href="/give"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            The donation page
          </Link>{" "}
          is served separately and may still be working.
        </p>
      </div>
    </div>
  );
}
