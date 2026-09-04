"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitIntention, type IntentionFormState } from "@/app/pray/actions";
import { Button } from "@/components/ui/button";

const INITIAL: IntentionFormState = { status: "idle" };

export interface IntentionFormAppeal {
  slug: string;
  title: string;
}

export function IntentionForm({ appeals }: { appeals: IntentionFormAppeal[] }) {
  const [state, formAction] = useActionState(submitIntention, INITIAL);

  return (
    <form action={formAction} className="rounded-lg border border-line bg-surface p-6">
      <h2 className="font-serif text-xl font-semibold text-ink">Add an intention</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Intentions are read before they appear, so yours will not show up
        immediately. Please do not include anyone&rsquo;s private details.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-ink">
            Your intention
          </label>
          <textarea
            id="text"
            name="text"
            required
            rows={4}
            maxLength={500}
            placeholder="For the families sheltering in the parish hall…"
            className="mt-1.5 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink">
              Your name <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              maxLength={80}
              autoComplete="name"
              className="mt-1.5 h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            />
          </div>

          <div>
            <label htmlFor="campaignSlug" className="block text-sm font-medium text-ink">
              For an appeal <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <select
              id="campaignSlug"
              name="campaignSlug"
              defaultValue=""
              className="mt-1.5 h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <option value="">Not for a specific appeal</option>
              {appeals.map((appeal) => (
                <option key={appeal.slug} value={appeal.slug}>
                  {appeal.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mt-4 rounded-md p-3 text-sm ${
            state.status === "error"
              ? "bg-critical-soft text-critical"
              : "bg-success-soft text-success"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  // useFormStatus must be read from a child of the form, not the form itself.
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="mt-5">
      {pending ? "Sending…" : "Share this intention"}
    </Button>
  );
}
