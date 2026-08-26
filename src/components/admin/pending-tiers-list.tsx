"use client";

import * as React from "react";
import Link       from "next/link";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { TIER_LABELS, TIER_PRICES } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface PendingEvent {
  id:         number;
  name:       string;
  tier:       string;
  organizer:  { name: string; phone: string | null; email: string };
}

interface Props {
  events:    PendingEvent[];
  totalCount: number;
}

export function PendingTiersList({ events: initial, totalCount }: Props) {
  const { toast }                   = useToast();
  const [events,     setEvents]     = React.useState(initial);
  const [activating, setActivating] = React.useState<number | null>(null);

  async function activate(eventId: number) {
    setActivating(eventId);
    try {
      const res  = await fetch(`/api/v1/admin/events/${eventId}/activate-tier`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error ?? "Activation failed", variant: "destructive" }); return; }
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: "Tier activated!" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setActivating(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-400">
        <CheckCircle2 size={16} className="text-green-400" /> All tier activations are up to date
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => (
        <div key={ev.id} className="flex items-center gap-3 py-3 border-b border-warm-50 last:border-0">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 text-sm truncate">{ev.name}</div>
            <div className="text-xs text-gray-400">{ev.organizer.name} · {ev.organizer.phone ?? ev.organizer.email}</div>
          </div>
          <Badge variant={ev.tier as "basic" | "standard" | "premium" | "royal"} className="shrink-0">
            {TIER_LABELS[ev.tier as keyof typeof TIER_LABELS]}
          </Badge>
          <div className="text-sm font-semibold text-gray-700 shrink-0">
            {formatCurrency(BigInt(TIER_PRICES[ev.tier as keyof typeof TIER_PRICES]))}
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shrink-0"
            disabled={activating === ev.id}
            onClick={() => activate(ev.id)}
          >
            {activating === ev.id
              ? <Loader2 size={12} className="animate-spin" />
              : <CheckCircle2 size={12} />}
            Activate
          </Button>
        </div>
      ))}
      {totalCount > events.length && (
        <div className="pt-2">
          <Link
            href="/admin/tiers"
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold"
          >
            View all {totalCount} pending activations <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
