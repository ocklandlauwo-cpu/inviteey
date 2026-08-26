import type { UserRole, EventType, EventTier, EventStatus, InviteeCat, RsvpStatus } from "@prisma/client";

export type { UserRole, EventType, EventTier, EventStatus, InviteeCat, RsvpStatus };

export interface SessionUser {
  id:     string;
  email:  string;
  name:   string;
  role:   UserRole;
  status: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items:      T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface TierLimits {
  invitees:          number;
  rsvp:              boolean;
  ecard:             boolean;
  ecardCustom:       boolean;
  smsNotif:          boolean;
  whatsappNotif:     boolean;
  contributions:     boolean;
  budget:            boolean;
  vendors:           boolean;
  reports:           boolean;
  exportCsv:         boolean;
  multipleEvents:    boolean;
  staffAccess:       boolean;
  qrCheckin:         boolean;
  aiSuggestions:     boolean;
}

export const TIER_LIMITS: Record<EventTier, TierLimits> = {
  basic: {
    invitees: 5, rsvp: false, ecard: false, ecardCustom: false,
    smsNotif: false, whatsappNotif: false, contributions: false,
    budget: false, vendors: false, reports: false, exportCsv: false,
    multipleEvents: false, staffAccess: false, qrCheckin: false, aiSuggestions: false,
  },
  standard: {
    invitees: 251, rsvp: true, ecard: true, ecardCustom: false,
    smsNotif: true, whatsappNotif: true, contributions: true,
    budget: false, vendors: false, reports: true, exportCsv: false,
    multipleEvents: true, staffAccess: false, qrCheckin: true, aiSuggestions: false,
  },
  premium: {
    invitees: 551, rsvp: true, ecard: true, ecardCustom: true,
    smsNotif: true, whatsappNotif: true, contributions: true,
    budget: true, vendors: true, reports: true, exportCsv: true,
    multipleEvents: true, staffAccess: true, qrCheckin: true, aiSuggestions: true,
  },
  royal: {
    invitees: 1001, rsvp: true, ecard: true, ecardCustom: true,
    smsNotif: true, whatsappNotif: true, contributions: true,
    budget: true, vendors: true, reports: true, exportCsv: true,
    multipleEvents: true, staffAccess: true, qrCheckin: true, aiSuggestions: true,
  },
};

export const TIER_PRICES: Record<EventTier, number> = {
  basic:    0,
  standard: 149999,
  premium:  359999,
  royal:    599999,
};

export const TIER_LABELS: Record<EventTier, string> = {
  basic:    "Basic",
  standard: "Standard",
  premium:  "Premium",
  royal:    "Royal",
};

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "TZS", label: "TZS — Tanzanian Shilling" },
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "UGX", label: "UGX — Ugandan Shilling" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "GHS", label: "GHS — Ghanaian Cedi" },
  { code: "RWF", label: "RWF — Rwandan Franc" },
  { code: "ZMW", label: "ZMW — Zambian Kwacha" },
  { code: "MWK", label: "MWK — Malawian Kwacha" },
  { code: "USD", label: "USD — US Dollar" },
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding:       "Wedding",
  birthday:      "Birthday",
  sendoff:       "Send-off",
  kitchen_party: "Kitchen Party",
  corporate:     "Corporate",
  fundraising:   "Fundraising",
  other:         "Other",
};
