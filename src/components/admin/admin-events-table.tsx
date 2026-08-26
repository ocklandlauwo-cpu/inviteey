"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ScanLine, CreditCard, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { TIER_LABELS, EVENT_TYPE_LABELS } from "@/types";
import { Loader2 } from "lucide-react";
import type { EventTier, EventType, EventStatus } from "@prisma/client";

interface EventRow {
  id:                       number;
  name:                     string;
  type:                     EventType;
  status:                   EventStatus;
  tier:                     EventTier;
  eventDate:                Date;
  createdAt:                Date;
  ecardAddonActive:         boolean;
  notificationsAddonActive: boolean;
  organizer: { id: number; name: string; email: string };
  _count:    { invitees: number };
}

const STATUS_VARIANT: Record<EventStatus, "success" | "warning" | "error" | "info" | "outline"> = {
  draft:     "outline",
  active:    "success",
  event_day: "info",
  completed: "outline",
  cancelled: "error",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  draft:     "Draft",
  active:    "Active",
  event_day: "Event Day",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TIER_FILTERS: { value: "all" | EventTier; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "basic",    label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium",  label: "Premium" },
  { value: "royal",    label: "Royal" },
];

const ALL_TIERS: EventTier[] = ["basic", "standard", "premium", "royal"];

export function AdminEventsTable({ events: initial }: { events: EventRow[] }) {
  const { toast } = useToast();
  const [events, setEvents] = React.useState(initial);
  const [search, setSearch] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState<"all" | EventTier>("all");
  const [page, setPage] = React.useState(1);
  const [updating,        setUpdating]        = React.useState<number | null>(null);
  const [updatingStatus,  setUpdatingStatus]  = React.useState<number | null>(null);
  const [togglingAddon,   setTogglingAddon]   = React.useState<string | null>(null);

  async function toggleAddon(eventId: number, field: "ecardAddonActive" | "notificationsAddonActive", current: boolean) {
    const key = `${eventId}:${field}`;
    setTogglingAddon(key);
    try {
      const res  = await fetch(`/api/v1/admin/events/${eventId}/addons`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: !current }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, [field]: !current } : e));
      toast({ title: `Add-on ${!current ? "enabled" : "disabled"}` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setTogglingAddon(null);
    }
  }

  const ALL_STATUSES: EventStatus[] = ["draft", "active", "event_day", "completed", "cancelled"];

  async function updateStatus(eventId: number, status: EventStatus) {
    setUpdatingStatus(eventId);
    try {
      const res  = await fetch(`/api/v1/admin/events/${eventId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status } : e));
      toast({ title: `Status → ${STATUS_LABEL[status]}` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function updateTier(eventId: number, tier: EventTier) {
    setUpdating(eventId);
    try {
      const res  = await fetch(`/api/v1/admin/events/${eventId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, tier } : e));
      toast({ title: "Tier updated" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  const filtered = events.filter(e => {
    const matchesFilter = tierFilter === "all" || e.tier === tierFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.organizer.name.toLowerCase().includes(search.toLowerCase()) ||
      e.organizer.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, tierFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by event or organizer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {TIER_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTierFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tierFilter === f.value
                  ? "bg-amber-600 text-white"
                  : "bg-warm-50 text-gray-500 hover:bg-warm-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No events match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Organizer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Invitees</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Event Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden xl:table-cell">Add-ons</th>
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
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                      {EVENT_TYPE_LABELS[event.type]}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={event.tier}
                        disabled={updating === event.id}
                        onValueChange={v => updateTier(event.id, v as EventTier)}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue>
                            <Badge variant={event.tier} className="text-xs">{TIER_LABELS[event.tier]}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_TIERS.map(t => (
                            <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {updatingStatus === event.id && <Loader2 size={12} className="animate-spin text-gray-400" />}
                        <Select
                          value={event.status}
                          disabled={updatingStatus === event.id}
                          onValueChange={v => updateStatus(event.id, v as EventStatus)}
                        >
                          <SelectTrigger className="h-7 w-[118px] text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <SelectValue>
                              <Badge variant={STATUS_VARIANT[event.status]} className="text-xs">{STATUS_LABEL[event.status]}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-gray-600">
                      {event._count.invitees}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          title="E-Card Add-on"
                          disabled={togglingAddon === `${event.id}:ecardAddonActive`}
                          onClick={() => toggleAddon(event.id, "ecardAddonActive", event.ecardAddonActive)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                            event.ecardAddonActive
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-warm-50 border-warm-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          <CreditCard size={11} /> E-Card
                        </button>
                        <button
                          title="Notifications Add-on"
                          disabled={togglingAddon === `${event.id}:notificationsAddonActive`}
                          onClick={() => toggleAddon(event.id, "notificationsAddonActive", event.notificationsAddonActive)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                            event.notificationsAddonActive
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-warm-50 border-warm-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          <Bell size={11} /> Notifs
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" asChild>
                        <Link href={`/admin/checkin/${event.id}`}>
                          <ScanLine size={12} /> Check-in
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
