import Image from "next/image";

/**
 * About hero — the same treatment as the home hero, deliberately a different
 * subject. The home photograph shows what the money buys; this one shows who is
 * asking for it.
 *
 * Everything about the image lives in this one constant, so swapping the
 * photograph is a single edit: file, alt text and credit move together and
 * cannot drift apart.
 *
 * Photograph: Dennis Zhang (@windagh) on Unsplash.
 * Free under the Unsplash License; credited anyway.
 *
 * Alt text is authored, per the dignity policy in AGENTS.md — it describes what
 * is in the frame and nothing else. No identifiable person appears in it.
 */
const HERO_IMAGE = {
  src: "/about-candles.jpg",
  alt: "Hundreds of red and white votive candles burning on tiered stands in a gilded gothic chapel, beneath a painting of the Sacred Heart.",
  credit: "Dennis Zhang",
  creditHref: "https://unsplash.com/@windagh",
  note: "Illustrative — not a photograph of a partner parish.",
} as const;

export function AboutHero() {
  return (
    // Shorter than the home hero on purpose: this page introduces itself, it
    // does not need to make the first pitch a second time.
    // `isolate` keeps the negative z-index of the photograph and scrim inside
    // this section rather than letting them slide behind the page background.
    <section className="relative isolate flex min-h-[24rem] items-end overflow-hidden border-b border-line md:min-h-[30rem]">
      <Image
        src={HERO_IMAGE.src}
        alt={HERO_IMAGE.alt}
        fill
        // The hero is the LCP element on this page.
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      <div className="container-page w-full py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-hero-accent">
            <span aria-hidden="true" className="h-px w-8 bg-hero-accent" />
            About us
          </p>

          <h1 className="mt-6 font-serif text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-hero-ink md:text-6xl">
            We do not deliver the aid. We fund the people who do.
          </h1>
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
