import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

const FOOTER_SECTIONS = [
  {
    heading: "Give",
    links: [
      { href: "/appeals", label: "Current appeals" },
      { href: "/give", label: "Make a donation" },
      { href: "/monthly", label: "Give monthly" },
      { href: "/pray", label: "Prayer intentions" },
    ],
  },
  {
    heading: "Accountability",
    links: [
      { href: "/transparency", label: "Where the money goes" },
      { href: "/transparency/ledger", label: "Full ledger" },
      { href: "/partners", label: "Our partners" },
      { href: "/about#governance", label: "Governance" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/crises", label: "Active crises" },
      { href: "/news", label: "Field updates" },
      { href: "/about", label: "About us" },
      { href: "/about#contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/donor-privacy", label: "Donor privacy" },
      { href: "/legal/refunds", label: "Refund policy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-sunken">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <p className="font-serif text-lg font-semibold text-ink">{siteConfig.name}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              {siteConfig.description}
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.heading} aria-labelledby={`footer-${section.heading}`}>
              <h2
                id={`footer-${section.heading}`}
                className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle"
              >
                {section.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
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
          ))}
        </div>

        {/* Required disclosure block. Donors are entitled to know who is
            actually receiving their money and under what registration. */}
        <div className="mt-12 border-t border-line pt-8">
          <div className="flex flex-col gap-4 text-xs leading-relaxed text-ink-subtle sm:flex-row sm:items-end sm:justify-between">
            <address className="not-italic">
              <span className="block font-medium text-ink-muted">
                {siteConfig.legal.entityName}
              </span>
              {siteConfig.legal.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="mt-1 block">
                {siteConfig.legal.registrationAuthority} no.{" "}
                {siteConfig.legal.registrationNumber}
              </span>
            </address>

            <p>
              © {new Date().getFullYear()} {siteConfig.name}. Donations are
              non-refundable except as set out in our{" "}
              <Link href="/legal/refunds" className="underline underline-offset-2 hover:text-ink">
                refund policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
