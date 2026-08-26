"use client";

import * as React from "react";
import { Search, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import type { Invitee, Event, RsvpResponse, RsvpStatus } from "@prisma/client";

type InviteeWithRsvp = Invitee & { rsvpResponses: RsvpResponse[] };

interface Props {
  event:           Event;
  initialInvitees: InviteeWithRsvp[];
}

const RSVP_BADGE: Record<string, "secondary" | "success" | "error"> = {
  pending:   "secondary",
  confirmed: "success",
  declined:  "error",
};

const FILTERS: { value: "all" | RsvpStatus; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined",  label: "Declined" },
  { value: "pending",   label: "Pending" },
];

export function RsvpClient({ event, initialInvitees }: Props) {
  const { toast } = useToast();
  const [invitees, setInvitees] = React.useState(initialInvitees);
  const [search,   setSearch]   = React.useState("");
  const [filter,   setFilter]   = React.useState<"all" | RsvpStatus>("all");
  const [updating, setUpdating] = React.useState<number | null>(null);
  const [page,     setPage]     = React.useState(1);

  const counts = {
    confirmed: invitees.filter(i => i.rsvpStatus === "confirmed").length,
    declined:  invitees.filter(i => i.rsvpStatus === "declined").length,
    pending:   invitees.filter(i => i.rsvpStatus === "pending").length,
    total:     invitees.length,
  };

  const filtered = invitees.filter(inv => {
    const matchesFilter = filter === "all" || inv.rsvpStatus === filter;
    const matchesSearch =
      inv.name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.phone ?? "").includes(search) ||
      (inv.email ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, filter]);

  async function handleStatusChange(inviteeId: number, rsvpStatus: RsvpStatus) {
    setUpdating(inviteeId);
    try {
      const res  = await fetch(`/api/v1/events/${event.id}/invitees/${inviteeId}/rsvp`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rsvpStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Update failed", description: json.error, variant: "destructive" }); return; }
      setInvitees(prev => prev.map(i => i.id === inviteeId ? { ...i, rsvpStatus } : i));
      toast({ title: "RSVP status updated" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Guests</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{counts.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 size={12} className="text-green-500" /> Confirmed
          </p>
          <p className="text-2xl font-extrabold text-green-600 mt-1">{counts.confirmed}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <XCircle size={12} className="text-red-400" /> Declined
          </p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">{counts.declined}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Clock size={12} className="text-gray-400" /> Pending
          </p>
          <p className="text-2xl font-extrabold text-gray-600 mt-1">{counts.pending}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.value
                  ? "bg-amber-600 text-white"
                  : "bg-warm-50 text-gray-500 hover:bg-warm-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-warm-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">
              {search || filter !== "all" ? "No guests match your filters." : "No guests added yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Last Response</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(inv => (
                  <tr key={inv.id} className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.name}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-gray-500 text-xs">
                        {inv.phone ?? "—"}
                        {inv.email && <div>{inv.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">{inv.category}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {inv.rsvpResponses[0] ? (
                        <div className="text-xs text-gray-500">
                          {new Date(inv.rsvpResponses[0].respondedAt).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant={RSVP_BADGE[inv.rsvpStatus] ?? "secondary"} className="text-xs capitalize hidden sm:inline-flex">
                          {inv.rsvpStatus}
                        </Badge>
                        <Select
                          value={inv.rsvpStatus}
                          onValueChange={v => handleStatusChange(inv.id, v as RsvpStatus)}
                          disabled={updating === inv.id}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            {updating === inv.id ? <Loader2 size={12} className="animate-spin" /> : <SelectValue />}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
