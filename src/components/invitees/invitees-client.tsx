"use client";

import * as React from "react";
import { Plus, Search, Upload, Trash2, Pencil, UserCheck, QrCode, Loader2 } from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import { useToast }  from "@/components/ui/use-toast";
import { AddInviteeDialog }  from "@/components/invitees/add-invitee-dialog";
import { EditInviteeDialog } from "@/components/invitees/edit-invitee-dialog";
import { QrCodeModal }       from "@/components/invitees/qr-code-modal";
import { ConfirmDialog }     from "@/components/ui/confirm-dialog";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { TierUpgradeBanner } from "@/components/events/tier-upgrade-banner";
import type { Invitee, Event } from "@prisma/client";

interface Props {
  event:            Event;
  initialInvitees:  Invitee[];
  limit:            number;
  limitStatus:      "none" | "warning" | "at_limit" | "over_limit";
}

const RSVP_BADGE: Record<string, "secondary" | "success" | "error"> = {
  pending:   "secondary",
  confirmed: "success",
  declined:  "error",
};

const CHECKIN_BADGE: Record<string, "secondary" | "info"> = {
  not_arrived: "secondary",
  checked_in:  "info",
};

export function InviteesClient({ event, initialInvitees, limit, limitStatus }: Props) {
  const { toast }   = useToast();
  const [invitees,  setInvitees]  = React.useState(initialInvitees);
  const [search,    setSearch]    = React.useState("");
  const [addOpen,   setAddOpen]   = React.useState(false);
  const [editing,   setEditing]   = React.useState<Invitee | null>(null);
  const [deleting,  setDeleting]  = React.useState<number | null>(null);
  const [confirming, setConfirming] = React.useState<Invitee | null>(null);
  const [page, setPage]         = React.useState(1);
  const [importing, setImporting]   = React.useState(false);
  const [qrInvitee, setQrInvitee]  = React.useState<Invitee | null>(null);
  const csvInputRef                 = React.useRef<HTMLInputElement>(null);

  const filtered = invitees.filter(inv =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    (inv.phone ?? "").includes(search) ||
    (inv.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search]);

  const canAdd = limitStatus !== "at_limit" && limitStatus !== "over_limit";

  async function handleDelete(inviteeId: number) {
    setDeleting(inviteeId);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/invitees/${inviteeId}`, { method: "DELETE" });
      if (!res.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
      setInvitees(prev => prev.filter(i => i.id !== inviteeId));
      toast({ title: "Guest removed" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  function onInviteeAdded(inv: Invitee) {
    setInvitees(prev => [inv, ...prev]);
    setAddOpen(false);
  }

  function onInviteeSaved(inv: Invitee) {
    setInvitees(prev => prev.map(i => i.id === inv.id ? inv : i));
    setEditing(null);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res  = await fetch(`/api/v1/events/${event.id}/invitees/import`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Import failed", description: json.error, variant: "destructive" }); return; }
      toast({
        title: `Imported ${json.imported} guest${json.imported !== 1 ? "s" : ""}` +
               (json.skipped > 0 ? `, ${json.skipped} skipped` : ""),
      });
      if (json.imported > 0) {
        const fresh = await fetch(`/api/v1/events/${event.id}/invitees`);
        const data  = await fresh.json();
        if (fresh.ok) setInvitees(data.data ?? data);
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Limit banner */}
      {(limitStatus === "warning" || limitStatus === "at_limit" || limitStatus === "over_limit") && (
        <TierUpgradeBanner status={limitStatus} current={invitees.length} limit={limit} eventId={event.id} tier={event.tier} />
      )}

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

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{invitees.length}</span>/{limit} guests
        </div>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsvImport}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={importing}
          onClick={() => csvInputRef.current?.click()}
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Import CSV
        </Button>

        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          disabled={!canAdd}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={14} /> Add Guest
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-warm-50 flex items-center justify-center mx-auto mb-4">
              <UserCheck size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">
              {search ? "No guests match your search." : "No guests added yet. Add your first guest!"}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RSVP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Check-in</th>
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
                    <td className="px-4 py-3">
                      <Badge variant={RSVP_BADGE[inv.rsvpStatus] ?? "secondary"} className="text-xs capitalize">
                        {inv.rsvpStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={CHECKIN_BADGE[inv.checkinStatus] ?? "secondary"} className="text-xs">
                        {inv.checkinStatus === "not_arrived" ? "Pending" : "Checked In"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          title="View QR code"
                          onClick={() => setQrInvitee(inv)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          title="Edit guest"
                          onClick={() => setEditing(inv)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Remove guest"
                          onClick={() => setConfirming(inv)}
                          disabled={deleting === inv.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {deleting === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
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

      {/* Add dialog */}
      <AddInviteeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={onInviteeAdded}
        eventId={event.id}
        canAdd={canAdd}
      />

      {/* Edit dialog */}
      <EditInviteeDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={onInviteeSaved}
        eventId={event.id}
        invitee={editing}
      />

      {/* QR code modal */}
      <QrCodeModal
        open={!!qrInvitee}
        onClose={() => setQrInvitee(null)}
        name={qrInvitee?.name ?? ""}
        qrToken={(qrInvitee as unknown as { qrToken?: string })?.qrToken ?? ""}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          await handleDelete(confirming.id);
          setConfirming(null);
        }}
        title="Remove guest?"
        description={`This will remove "${confirming?.name ?? ""}" from your guest list. This action cannot be undone.`}
        confirmText="Remove"
        loading={deleting === confirming?.id}
      />
    </div>
  );
}
