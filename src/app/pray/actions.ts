"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";

/**
 * Prayer wall actions.
 *
 * Nothing submitted here appears on the site until a moderator approves it.
 * The terms page commits us to reviewing intentions before publication, and an
 * open text box on a public site attracts exactly what you would expect.
 */

/**
 * `formData.get()` returns null for a field the client did not send, and null
 * is not undefined: `.optional()` would reject it and fail the whole
 * submission. The browser form always posts every field, so this only bites
 * callers that omit one — which is precisely the case worth being robust
 * about. Hence `.nullish()` on both optional fields.
 */
const intentionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Please write a little more.")
    .max(500, "Please keep intentions under 500 characters."),
  name: z
    .string()
    .trim()
    .max(80, "Please use a shorter name.")
    .nullish()
    .transform((value) => value || null),
  campaignSlug: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => value || null),
});

export interface IntentionFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function submitIntention(
  _previous: IntentionFormState,
  formData: FormData,
): Promise<IntentionFormState> {
  const parsed = intentionSchema.safeParse({
    text: formData.get("text"),
    name: formData.get("name"),
    campaignSlug: formData.get("campaignSlug"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check what you have written.",
    };
  }

  const { text, name, campaignSlug } = parsed.data;

  // Resolve the campaign rather than trusting the posted slug, so an intention
  // cannot be attached to an appeal that does not exist.
  const campaign = campaignSlug
    ? await db.campaign.findUnique({ where: { slug: campaignSlug }, select: { id: true } })
    : null;

  await db.prayerIntention.create({
    data: {
      text,
      name,
      campaignId: campaign?.id ?? null,
      // approvedAt stays null: a moderator publishes it, not the submitter.
    },
  });

  return {
    status: "success",
    message:
      "Thank you. Your intention has been received and will appear once it has been read.",
  };
}

/**
 * Records that someone prayed for an intention.
 *
 * Deliberately not deduplicated per visitor: doing so would mean identifying
 * readers on a page whose whole purpose is quiet, and someone praying twice is
 * not a problem worth surveillance to solve.
 */
export async function recordPrayer(intentionId: string): Promise<void> {
  await db.prayerIntention.updateMany({
    // The approvedAt guard prevents incrementing a hidden or rejected item.
    where: { id: intentionId, approvedAt: { not: null } },
    data: { prayerCount: { increment: 1 } },
  });

  revalidatePath("/pray");
}
