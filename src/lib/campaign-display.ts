import type { CrisisType, PartnerType, Urgency } from "@/generated/prisma";

/** Display metadata for enum values. Kept out of components so the wording of
 *  a crisis type is decided once, not per-template. */

export const CRISIS_TYPE_LABELS: Record<CrisisType, string> = {
  CONFLICT: "Conflict",
  FAMINE: "Famine",
  DROUGHT: "Drought",
  EARTHQUAKE: "Earthquake",
  FLOOD: "Flooding",
  STORM: "Storm",
  DISPLACEMENT: "Displacement",
  DISEASE: "Disease outbreak",
  PERSECUTION: "Persecution",
  OTHER: "Emergency",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  CRITICAL: "Critical need",
  HIGH: "Urgent",
  NORMAL: "Ongoing",
};

/** How a receiving organisation is described where donors can see it. */
export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  CARITAS_NATIONAL: "National Caritas office",
  DIOCESE: "Diocese",
  RELIGIOUS_ORDER: "Religious order",
  PARISH: "Parish network",
  NGO: "Non-governmental organisation",
};

export const URGENCY_TONES = {
  CRITICAL: "critical",
  HIGH: "warning",
  NORMAL: "neutral",
} as const satisfies Record<Urgency, "critical" | "warning" | "neutral">;
