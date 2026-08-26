"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Send, ListChecks } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { ComposeNotificationDialog } from "@/components/notifications/compose-dialog";
import { useToast } from "@/components/ui/use-toast";
import { canAccessFeature } from "@/lib/tier-access";
import { TIER_LABELS } from "@/types";
import type { EventTier } from "@prisma/client";

interface EventRow {
  id:   number;
  name: string;
  tier: EventTier;
  organizer: { id: number; name: string; email: string };
}

export function AdminNotificationsTable({ events }: { events: EventRow[] }) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [page, setPage]     = React.useState(1);
  const [composing, setComposing] = React.useState<EventRow | null>(null);

  const filtered = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.organizer.name.toLowerCase().includes(search.toLowerCase()) ||
    e.organizer.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by event or organizer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100 bg-warm-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organizer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tier</th>
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
                    <div className="text-xs text-gray-400">{event.organizer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={event.tier as "basic" | "standard" | "premium" | "royal"}>
                      {TIER_LABELS[event.tier]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="gap-2" asChild>
                        <Link href={`/admin/notifications/${event.id}`}>
                          <ListChecks size={14} /> View Status
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        onClick={() => setComposing(event)}
                      >
                        <Send size={14} /> Compose
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>

      {composing && (
        <ComposeNotificationDialog
          open={!!composing}
          onClose={() => setComposing(null)}
          onSent={() => {
            toast({ title: `Notification sent to guests of "${composing.name}"` });
            setComposing(null);
          }}
          eventId={composing.id}
          tier={composing.tier}
          hasSms={canAccessFeature(composing.tier, "smsNotif")}
          hasWhatsApp={canAccessFeature(composing.tier, "whatsappNotif")}
        />
      )}
    </div>
  );
}
