import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";

/**
 * Home hero — full-bleed photograph with the headline set over it.
 *
 * Everything about the image lives in this one constant, so swapping the
 * photograph is a single edit: file, alt text and credit move together and
 * cannot drift apart.
 *
 * Photograph: Giri (@giridharan) on Unsplash, Vellore, Tamil Nadu.
 * Free under the Unsplash License; credited anyway.
 *
 * Alt text is authored, per the dignity policy in AGENTS.md — it describes
 * what is in the frame and nothing else.
 */
const HERO_IMAGE = {
  src: "/hero-provisions.jpg",
  alt: "Open sacks of grain, pulses and pasta lined up in a dimly lit store room, with daylight falling across the floor beside them.",
  credit: "Giri",
  creditHref: "https://unsplash.com/@giridharan",
  note: "Illustrative — not a photograph of a funded delivery.",
} as const;

export function HomeHero({ year }: { year: number }) {
  return (
    // `isolate` keeps the negative z-index of the photograph and scrim inside
    // this section rather than letting them slide behind the page background.
    <section className="relative isolate flex min-h-[34rem] items-center overflow-hidden border-b border-line md:min-h-[40rem] lg:min-h-[44rem]">
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        // The hero is the LCP element on the home page.
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      <div className="container-page w-full py-20 md:py-24">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-hero-accent">
            <span aria-hidden="true" className="h-px w-8 bg-hero-accent" />
            Emergency relief · {year}
          </p>

          <h1 className="mt-6 font-serif text-[2.5rem] leading-[1.03] font-semibold tracking-tight text-hero-ink md:text-6xl lg:text-7xl">
            Give where it is needed most — and see exactly where it went.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-hero-ink-muted">
            We fund Catholic partners already working inside the world&rsquo;s
            hardest places. Every appeal publishes a dated ledger of what was
            sent, to whom, and what it bought — with the receipts attached.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/give" variant="accent" size="lg">
              Make a donation
            </ButtonLink>
            {/* The stock outline variant resolves to `text-ink`, which is near
                black in light mode and would vanish against the photograph. */}
            <ButtonLink
              href="/transparency"
              variant="outline"
              size="lg"
              className="border-hero-ink/35 text-hero-ink hover:bg-hero-ink/10"
            >
              See the ledger
            </ButtonLink>
          </div>
        </div>
      </div>

      <p className="absolute bottom-3 right-4 max-w-[60%] text-right text-[0.6875rem] leading-snug text-hero-ink-muted/70">
        Photograph:{" "}
        <a
          href={HERO_IMAGE.creditHref}
          rel="noopener noreferrer"
          target="_blank"
          className="underline underline-offset-2 hover:text-hero-ink"
        >
          {HERO_IMAGE.credit}
        </a>{" "}
        / Unsplash. {HERO_IMAGE.note}
      </p>
    </section>
  );
}
