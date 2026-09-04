import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Field reports from the appeals we fund, written by our partners and our own staff.",
};

export default async function NewsPage() {
  const posts = await db.newsPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { campaign: { select: { slug: true, title: true, countryName: true } } },
  });

  const [lead, ...rest] = posts;

  return (
    <div className="container-page py-14 md:py-16">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Updates
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          What actually happened after the money arrived. Reports come from the
          partners delivering the work, and we publish the difficult ones as
          well as the encouraging ones.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-line-strong bg-surface-sunken p-12 text-center text-ink-muted">
          No updates have been published yet.
        </p>
      ) : (
        <>
          {/* Lead story gets the width; a single-column list of equal cards
              gives a reader no sense of what matters most. */}
          <article className="mt-12 border-b border-line pb-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              {lead.coverImageUrl && (
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-surface-sunken">
                  <Image
                    src={lead.coverImageUrl}
                    alt={lead.coverImageAlt ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              <div className={lead.coverImageUrl ? "" : "md:col-span-2 max-w-3xl"}>
                <Meta post={lead} />
                <h2 className="mt-3 font-serif text-3xl leading-tight font-semibold text-ink md:text-4xl">
                  <Link href={`/news/${lead.slug}`} className="hover:text-primary">
                    {lead.title}
                  </Link>
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-ink-muted">
                  {lead.excerpt}
                </p>
              </div>
            </div>
          </article>

          {rest.length > 0 && (
            <ul className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.id}>
                  <article className="group relative flex h-full flex-col">
                    {post.coverImageUrl && (
                      <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-lg bg-surface-sunken">
                        <Image
                          src={post.coverImageUrl}
                          alt={post.coverImageAlt ?? ""}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    )}

                    <Meta post={post} />

                    <h2 className="mt-2 font-serif text-xl leading-snug font-semibold text-ink">
                      <Link
                        href={`/news/${post.slug}`}
                        className="after:absolute after:inset-0"
                      >
                        {post.title}
                      </Link>
                    </h2>

                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {post.excerpt}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Meta({
  post,
}: {
  post: {
    publishedAt: Date | null;
    source: string;
    sourceName: string | null;
    campaign: { slug: string; title: string; countryName: string } | null;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {post.publishedAt && (
        <time
          dateTime={post.publishedAt.toISOString()}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle"
        >
          {post.publishedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      )}

      {post.campaign && (
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
          {post.campaign.countryName}
        </span>
      )}

      {/* Attribution is not optional: a syndicated item must never read as our
          own reporting. */}
      {post.source !== "EDITORIAL" && (
        <Badge>{post.sourceName ?? "Syndicated"}</Badge>
      )}
    </div>
  );
}
