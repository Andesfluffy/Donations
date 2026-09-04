import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { hasPlaceholderLegalDetails } from "@/lib/site-config";

const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy policy" },
  { href: "/legal/donor-privacy", label: "Donor privacy" },
  { href: "/legal/refunds", label: "Refund policy" },
  { href: "/legal/terms", label: "Terms" },
] as const;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const isDraft = hasPlaceholderLegalDetails();

  return (
    <div className="container-page py-14 md:py-16">
      {/* Shown while the registered entity details are still placeholders, and
          removed automatically once they are filled in. These documents are a
          starting point drafted against common requirements — they are not
          legal advice and have not been reviewed by a solicitor. */}
      {isDraft && (
        <div
          role="alert"
          className="mb-12 flex gap-3 rounded-lg border border-warning bg-warning-soft p-5"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-ink">
              Draft — not yet valid, and not legal advice
            </p>
            <p className="mt-1.5 text-ink-muted">
              The registered entity details on this site are still placeholders,
              so these policies do not yet describe a real organisation. They
              are a drafting starting point written against common charity and
              data-protection requirements, and they must be reviewed by a
              qualified adviser in your jurisdiction before you accept a single
              live donation. This notice disappears on its own once the entity
              details in{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">
                src/lib/site-config.ts
              </code>{" "}
              are completed.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">{children}</div>

        <nav aria-label="Policies" className="lg:order-last">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            Policies
          </h2>
          <ul className="mt-4 space-y-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
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
