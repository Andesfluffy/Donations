import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";

/**
 * Home hero.
 *
 * The photograph is provisions in a store room rather than people in distress.
 * That is deliberate: the dignity policy rules out using someone's hardship as
 * a fundraising image, and this site's argument is about *what the money
 * bought*, so the goods themselves are the honest subject. Alt text describes
 * what is in the frame, nothing more.
 *
 * Photograph: Giri (@giridharan) on Unsplash, Vellore, Tamil Nadu.
 * Free under the Unsplash License; credited anyway.
 */
const HERO_IMAGE = {
  src: "/hero-provisions.jpg",
  alt: "Open sacks of grain, pulses and pasta lined up in a dimly lit store room, with daylight falling across the floor beside them.",
  credit: "Giri",
  creditHref: "https://unsplash.com/@giridharan",
} as const;

export function HomeHero({ year }: { year: number }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      {/* A wash of the liturgical colour, kept far below the text so it reads
          as warmth in the paper rather than as a coloured panel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-season-soft opacity-60 blur-3xl"
      />

      <div className="container-page relative py-16 md:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-season">
              <span aria-hidden="true" className="h-px w-8 bg-season" />
              Emergency relief · {year}
            </p>

            <h1 className="mt-5 font-serif text-4xl leading-[1.05] font-semibold tracking-tight text-ink md:text-5xl lg:text-6xl">
              Give where it is needed most — and see exactly where it went.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              We fund Catholic partners already working inside the world&rsquo;s
              hardest places. Every appeal publishes a dated ledger of what was
              sent, to whom, and what it bought — with the receipts attached.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/give" size="lg">
                Make a donation
              </ButtonLink>
              <ButtonLink href="/transparency" variant="outline" size="lg">
                See the ledger
              </ButtonLink>
            </div>
          </div>

          <figure className="lg:pl-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line shadow-lg lg:aspect-[5/4]">
              <Image
                src={HERO_IMAGE.src}
                alt={HERO_IMAGE.alt}
                fill
                // Hero image is the LCP element on the home page.
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 text-xs text-ink-subtle">
              Photograph:{" "}
              <a
                href={HERO_IMAGE.creditHref}
                rel="noopener noreferrer"
                target="_blank"
                className="underline underline-offset-2 hover:text-ink-muted"
              >
                {HERO_IMAGE.credit}
              </a>{" "}
              / Unsplash. Illustrative — not a photograph of a funded delivery.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
