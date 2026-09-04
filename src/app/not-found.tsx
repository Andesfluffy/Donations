import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const ELSEWHERE = [
  { href: "/appeals", label: "Current appeals" },
  { href: "/crises", label: "Crises we are responding to" },
  { href: "/news", label: "Updates from the field" },
  { href: "/transparency", label: "The ledger" },
  { href: "/about", label: "About us" },
];

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] items-center py-20">
      <div className="max-w-xl">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
          404
        </p>

        <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          That page isn&rsquo;t here
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          The link may be out of date, or an appeal may have closed. Nothing has
          been removed from the ledger — every transfer we have ever published
          is still listed there.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            Back to the home page
          </ButtonLink>
          <ButtonLink href="/transparency" variant="outline" size="lg">
            See the ledger
          </ButtonLink>
        </div>

        <nav aria-label="Elsewhere on this site" className="mt-12 border-t border-line pt-6">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            Elsewhere on this site
          </h2>
          <ul className="mt-3 space-y-2">
            {ELSEWHERE.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-ink-muted transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
