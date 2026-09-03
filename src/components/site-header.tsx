import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { seasonLabel, type LiturgicalSeason } from "@/lib/liturgical";

export const NAV_LINKS = [
  { href: "/appeals", label: "Appeals" },
  { href: "/crises", label: "Crises" },
  { href: "/news", label: "Updates" },
  { href: "/transparency", label: "Transparency" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader({ season }: { season: LiturgicalSeason }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      {/* The season's one structural appearance: a hairline in the liturgical
          colour of the day. */}
      <div className="season-rule" aria-hidden="true" />

      <div className="container-page flex h-16 items-center gap-6 md:h-20">
        <Link href="/" className="group flex shrink-0 flex-col leading-none">
          <span className="font-serif text-lg font-semibold tracking-tight text-ink md:text-xl">
            Catholic Crisis Relief
          </span>
          <span className="mt-0.5 hidden text-[0.6875rem] uppercase tracking-[0.14em] text-ink-subtle sm:block">
            {seasonLabel(season)}
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-[0.9375rem] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeToggle />
          <ButtonLink href="/give" size="sm" className="hidden sm:inline-flex">
            Give now
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
