"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { EventTier } from "@prisma/client";
import { canAccessFeature } from "@/lib/tier-access";

interface Props {
  eventId: number;
  tier:    EventTier;
}

export function EventNavTabs({ eventId, tier }: Props) {
  const pathname = usePathname();
  const base     = `/events/${eventId}`;

  const tabs = [
    { label: "Overview",      href: base,                      always: true },
    { label: "Invitees",      href: `${base}/invitees`,         always: true },
    { label: "Contributions", href: `${base}/contributions`,    feature: "contributions" as const },
    { label: "RSVP",          href: `${base}/rsvp`,             feature: "rsvp" as const },
    { label: "E-Cards",       href: `${base}/ecards`,           feature: "ecard" as const },
    { label: "Notifications", href: `${base}/notifications`,    feature: "smsNotif" as const },
    { label: "Budget",        href: `${base}/budget`,           feature: "budget" as const },
    { label: "Check-in",      href: `${base}/checkin`,          feature: "qrCheckin" as const },
    { label: "Reports",       href: `${base}/reports`,          feature: "reports" as const },
  ].filter(t => t.always || (t.feature && canAccessFeature(tier, t.feature)));

  return (
    <div className="mt-4 -mb-px overflow-x-auto scrollbar-thin">
      <div className="flex gap-0 border-b border-warm-200 min-w-max">
        {tabs.map(tab => {
          const active = tab.href === base
            ? pathname === base
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
