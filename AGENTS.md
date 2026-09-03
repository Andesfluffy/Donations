<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Catholic Crisis Relief

A donation platform for humanitarian crisis appeals. The point of the project
is the ledger: donors can see what was received, what was sent, to whom, and
what it bought.

## The invariants

These are not style preferences. Breaking one is a defect.

1. **No currency figure is ever hand-entered or hardcoded.** Every "raised",
   "spent", "overhead" or percentage on the site comes from `src/lib/finance.ts`,
   which derives it from `Donation` and `Disbursement` rows. There is no CMS
   field, admin text box or constant containing a total. If you need a figure
   somewhere new, add a function to `finance.ts`; do not read rows ad hoc.

2. **Only the Stripe webhook creates `Donation` rows.** Never write one from
   the checkout success redirect, a server action, or a page. Donors close
   tabs; the webhook is the only reliable signal. Webhook handling must be
   idempotent via the `StripeEvent` table — Stripe retries.

3. **`Disbursement` is append-only.** Corrections insert a new row with
   `correctsId` pointing at the original. Never update an existing row's amount
   and never delete one. This is what makes the ledger evidence rather than a
   claim.

4. **Impact metrics cite a source.** An `ImpactMetric` without `verifiedAt` and
   a source is not displayed as verified.

5. **Seeded data is clearly fictional.** `prisma/seed.ts` marks every partner
   `[SAMPLE]` and refuses to run under `NODE_ENV=production`. Never make sample
   ledger data look real.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4
(CSS-first, no `tailwind.config.js`) · Prisma 7 + Postgres · Stripe ·
better-auth · Resend.

**Prisma 7 specifics** — this differs from older Prisma:
- Connection URLs are *not* in `schema.prisma`. Migrations read `DIRECT_URL`
  from `prisma.config.ts`; the runtime client builds a `PrismaPg` driver
  adapter from `DATABASE_URL` in `src/lib/db.ts`.
- The client generates to `src/generated/prisma` (gitignored). Import types
  from `@/generated/prisma`.
- Pin `7.10.0`. npm `latest` is an 8.x release candidate.

## Styling

Colour lives in semantic CSS variables in `src/app/globals.css`, mapped onto
Tailwind utilities via `@theme inline`. Use `bg-surface`, `text-ink-muted`,
`border-line` — never a raw palette name like `bg-blue-600`, and never a hex
value in a component. Light and dark both flip by reassigning variables.

`--season` carries the liturgical colour of the day, computed server-side in
`src/lib/liturgical.ts` and applied as `data-season` on `<html>`. It is used
only for hairline accents.

Money is rendered through `src/lib/money.ts` and always carries the `.tabular`
class so digits do not shift as totals update.

## Commands

```
npm run dev         # dev server
npm run build       # prisma generate + next build
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run db:migrate  # prisma migrate dev
npm run db:seed     # fictional development data
npm run db:studio   # browse the database
```

## Conventions

- Pages that show live financial data set `export const dynamic = "force-dynamic"`.
  A cached total is a wrong total.
- Validate every external input (webhooks, forms, feed payloads) with Zod at
  the boundary.
- Images of people follow a dignity-first policy: subjects shown as agents in
  their own recovery, alt text describing what they are doing. Campaign
  `coverImageAlt` is authored, never generated.
