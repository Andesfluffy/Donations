import { cn } from "@/lib/utils";

/**
 * Long-form document typography for policies and editorial pages.
 *
 * Written as explicit child selectors rather than a plugin so the measure,
 * rhythm and colour all come from the same tokens as the rest of the site.
 * The measure is capped at ~68 characters: legal text is read start to finish,
 * and a full-width line is measurably harder to track back from.
 */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[1.0625rem] leading-relaxed text-ink-muted",
        "[&>h2]:mt-12 [&>h2]:font-serif [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-ink",
        "[&>h3]:mt-8 [&>h3]:font-serif [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-ink",
        "[&>p]:mt-4",
        "[&>ul]:mt-4 [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul>li]:list-disc",
        "[&>ol]:mt-4 [&>ol]:space-y-2 [&>ol]:pl-5 [&>ol>li]:list-decimal",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&>table]:mt-6 [&>table]:w-full [&>table]:border-collapse [&>table]:text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page heading plus the date the policy was last revised. */
export function PolicyHeader({
  title,
  updated,
  summary,
}: {
  title: string;
  updated: string;
  summary: string;
}) {
  return (
    <header className="border-b border-line pb-8">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-[68ch] text-lg leading-relaxed text-ink-muted">{summary}</p>
      <p className="mt-5 text-sm text-ink-subtle">
        Last updated{" "}
        <time dateTime={updated}>
          {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </time>
      </p>
    </header>
  );
}
