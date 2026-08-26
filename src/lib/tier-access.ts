import type { EventTier as PrismaEventTier } from "@prisma/client";

export type EventTier = PrismaEventTier;

export type Feature =
  | "rsvp"
  | "ecard"
  | "ecardCustom"
  | "smsNotif"
  | "whatsappNotif"
  | "contributions"
  | "budget"
  | "vendors"
  | "reports"
  | "exportCsv"
  | "multipleEvents"
  | "staffAccess"
  | "qrCheckin"
  | "aiSuggestions";

const TIER_FEATURES: Record<Feature, EventTier[]> = {
  rsvp:           ["standard", "premium", "royal"],
  ecard:          ["standard", "premium", "royal"],
  ecardCustom:    ["premium",  "royal"],
  smsNotif:       ["standard", "premium", "royal"],
  whatsappNotif:  ["standard", "premium", "royal"],
  contributions:  ["standard", "premium", "royal"],
  budget:         ["premium",  "royal"],
  vendors:        ["premium",  "royal"],
  reports:        ["standard", "premium", "royal"],
  exportCsv:      ["premium",  "royal"],
  multipleEvents: ["standard", "premium", "royal"],
  staffAccess:    ["premium",  "royal"],
  qrCheckin:      ["standard", "premium", "royal"],
  aiSuggestions:  ["premium",  "royal"],
};

export const TIER_INVITEE_LIMITS: Record<EventTier, number> = {
  basic:    5,
  standard: 251,
  premium:  551,
  royal:    1001,
};

export function canAccessFeature(tier: EventTier, feature: Feature): boolean {
  return TIER_FEATURES[feature].includes(tier);
}

export function getInviteeLimit(tier: EventTier): number {
  return TIER_INVITEE_LIMITS[tier];
}

export function getInviteeLimitWarning(
  current: number,
  limit: number
): "none" | "warning" | "at_limit" | "over_limit" {
  if (current > limit) return "over_limit";
  if (current >= limit) return "at_limit";
  if (current / limit >= 0.8) return "warning";
  return "none";
}

export function getRequiredTierForFeature(feature: Feature): EventTier {
  const tiers: EventTier[] = ["basic", "standard", "premium", "royal"];
  for (const tier of tiers) {
    if (TIER_FEATURES[feature].includes(tier)) return tier;
  }
  return "royal";
}

export const TIER_DISPLAY: Record<EventTier, { label: string; badgeClass: string }> = {
  basic:    { label: "Basic",    badgeClass: "bg-green-100 text-green-800" },
  standard: { label: "Standard", badgeClass: "bg-blue-100 text-blue-800" },
  premium:  { label: "Premium",  badgeClass: "bg-amber-100 text-amber-800" },
  royal:    { label: "Royal",    badgeClass: "bg-purple-100 text-purple-800" },
};
