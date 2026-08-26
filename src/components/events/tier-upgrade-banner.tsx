import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventTier } from "@prisma/client";

interface Props {
  status:  "warning" | "at_limit" | "over_limit";
  current: number;
  limit:   number;
  eventId: number;
  tier:    EventTier;
}

export function TierUpgradeBanner({ status, current, limit, eventId, tier }: Props) {
  const messages = {
    warning:    `You've used ${current} of ${limit} guest slots. Consider upgrading before your event fills up.`,
    at_limit:   `You've reached your ${limit}-guest limit. Upgrade to add more guests.`,
    over_limit: `You have ${current} guests but your plan only allows ${limit}. Upgrade immediately.`,
  };

  const nextTier = tier === "basic" ? "Standard" : tier === "standard" ? "Premium" : "Royal";

  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
      status === "over_limit"
        ? "bg-red-50 border-red-200"
        : status === "at_limit"
        ? "bg-amber-50 border-amber-300"
        : "bg-yellow-50 border-yellow-200"
    }`}>
      <AlertTriangle
        size={18}
        className={
          status === "over_limit" ? "text-red-500 shrink-0 mt-0.5" :
          status === "at_limit"   ? "text-amber-600 shrink-0 mt-0.5" :
          "text-yellow-500 shrink-0 mt-0.5"
        }
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          status === "over_limit" ? "text-red-800" :
          status === "at_limit"   ? "text-amber-800" : "text-yellow-800"
        }`}>
          {messages[status]}
        </p>
      </div>
      {tier !== "royal" && (
        <Link href={`/events/${eventId}/settings#tier`}>
          <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs border-amber-400 text-amber-700 hover:bg-amber-50">
            Upgrade to {nextTier} <ArrowRight size={12} />
          </Button>
        </Link>
      )}
    </div>
  );
}
