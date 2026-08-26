"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { TIER_LABELS } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { TIER_PRICES } from "@/types";
import type { Event, User } from "@prisma/client";

type EventWithOrganizer = Event & {
  organizer: Pick<User, "id" | "name" | "email" | "phone">;
};

interface Props {
  events:  EventWithOrganizer[];
  adminId: number;
}

export function TierActivationTable({ events: initial, adminId: _adminId }: Props) {
  const { toast }     = useToast();
  const [events, setEvents] = React.useState(initial);
  const [activating, setActivating] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);

  const totalPages  = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function activate(eventId: number) {
    setActivating(eventId);
    try {
      const res  = await fetch(`/api/v1/admin/events/${eventId}/activate-tier`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: "Tier activated!", description: `Event ${eventId} tier activated.`, variant: "default" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setActivating(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
        <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No pending tier activations. All caught up!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-100 bg-warm-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organizer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tier Requested</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount Due</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(event => (
              <tr key={event.id} className="border-b border-warm-50 hover:bg-warm-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{event.name}</div>
                  <div className="text-xs text-gray-400">ID #{event.id}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-700">{event.organizer.name}</div>
                  <div className="text-xs text-gray-400">{event.organizer.phone ?? event.organizer.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={event.tier as "basic" | "standard" | "premium" | "royal"}>
                    {TIER_LABELS[event.tier]}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {formatCurrency(BigInt(TIER_PRICES[event.tier]))}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    disabled={activating === event.id}
                    onClick={() => activate(event.id)}
                  >
                    {activating === event.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <CheckCircle2 size={14} />
                    }
                    Activate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
