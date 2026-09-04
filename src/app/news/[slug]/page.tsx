import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface NewsPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewsPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.newsPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, status: true, coverImageUrl: true },
  });

  if (!post || post.status !== "PUBLISHED") return { title: "Update not found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
  const { slug } = await params;

  const post = await db.newsPost.findUnique({
    where: { slug },
    include: {
      campaign: {
        select: { slug: true, title: true, summary: true, countryName: true, status: true },
      },
      author: { select: { name: true } },
    },
  });

  // A draft is a 404 to the public, not a 403 — the existence of an unpublished
  // post is itself not public information.
  if (!post || post.status !== "PUBLISHED") notFound();

  return (
    <article className="container-page py-14 md:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/news" className="text-ink-subtle hover:text-ink">
          Updates
        </Link>
        {post.campaign && (
          <>
            <span className="mx-2 text-ink-subtle" aria-hidden="true">
              /
            </span>
            <span className="text-ink-muted">{post.campaign.countryName}</span>
          </>
        )}
      </nav>

      <header className="max-w-[68ch]">
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
          {post.source !== "EDITORIAL" && <Badge>{post.sourceName ?? "Syndicated"}</Badge>}
        </div>

        <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold tracking-tight text-ink md:text-5xl">
          {post.title}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-ink-muted">{post.excerpt}</p>

        {post.author?.name && (
          <p className="mt-4 text-sm text-ink-subtle">By {post.author.name}</p>
        )}
      </header>

      {post.coverImageUrl && (
        <figure className="mt-10">
          <div className="relative aspect-[2/1] overflow-hidden rounded-lg bg-surface-sunken">
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt ?? ""}
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
          {post.coverImageAlt && (
            <figcaption className="mt-3 text-sm text-ink-subtle">
              {post.coverImageAlt}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mt-10">
        <Prose>
          {post.body.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </Prose>
      </div>

      {/* Where an item came from a third-party feed, the original is credited
          and linked rather than absorbed. */}
      {post.source !== "EDITORIAL" && post.sourceUrl && (
        <aside className="mt-10 max-w-[68ch] rounded-lg border border-line bg-surface-sunken p-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            This update is based on reporting by{" "}
            <span className="font-medium text-ink">{post.sourceName ?? "another organisation"}</span>.
          </p>
          <a
            href={post.sourceUrl}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
          >
            Read the original
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </aside>
      )}

      {post.campaign && (
        <aside className="mt-12 max-w-[68ch] rounded-lg border border-line bg-surface p-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            The appeal this relates to
          </p>
          <h2 className="mt-3 font-serif text-xl font-semibold text-ink">
            <Link href={`/appeals/${post.campaign.slug}`} className="hover:text-primary">
              {post.campaign.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {post.campaign.summary}
          </p>

          {post.campaign.status === "ACTIVE" && (
            <ButtonLink href={`/give?appeal=${post.campaign.slug}`} className="mt-5">
              Give to this appeal
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          )}
        </aside>
      )}
    </article>
  );
}
