"use client";

import * as React from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, Trash2, CheckCircle2,
  Clock, XCircle, Ban,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog }          from "@/components/ui/confirm-dialog";
import { MarkInvoicePaidDialog }  from "@/components/admin/mark-invoice-paid-dialog";
import type { OrganizerOption }   from "@/components/admin/record-platform-payment-dialog";

const SERVICE_LABELS: Record<string, string> = {
  tier_standard:         "Tier Standard",
  tier_premium:          "Tier Premium",
  tier_royal:            "Tier Royal",
  sms_notification:      "SMS Notif",
  whatsapp_notification: "WhatsApp Notif",
  ecard_service:         "E-Card",
  extra_invitees:        "Extra Invitees",
  other:                 "Other",
};

interface InvoiceRow {
  id:           string;
  organizerId:  number;
  eventId:      number;
  serviceType:  string;
  description:  string | null;
  amount:       number;
  currencyCode: string;
  status:       string;
  dueDate:      string | null;
  notes:        string | null;
  createdAt:    string;
  organizer:    { id: number; name: string; email: string };
  event:        { id: number; name: string; type: string; tier: string };
  createdByUser:{ id: number; name: string };
  payment:      { id: string; paymentMethod: string; referenceNumber: string | null; paidAt: string } | null;
}

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en")}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid")      return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 size={11} /> Paid</Badge>;
  if (status === "pending")   return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock size={11} /> Pending</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-100 text-red-600 border-red-200 gap-1"><Ban size={11} /> Cancelled</Badge>;
  return <Badge>{status}</Badge>;
}

function CancelInvoiceButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [open, setOpen]     = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast }           = useToast();

  async function handleConfirm() {
    setLoading(true);
    const res = await fetch(`/api/v1/admin/invoices/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "cancelled" }),
    });
    setLoading(false);
    if (res.ok) { toast({ title: "Invoice cancelled" }); setOpen(false); onDone(); }
    else { toast({ title: "Error cancelling invoice", variant: "destructive" }); }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => setOpen(true)} title="Cancel invoice">
        <XCircle size={14} />
      </Button>
      <ConfirmDialog
        open={open} onClose={() => setOpen(false)} onConfirm={handleConfirm}
        title="Cancel Invoice" loading={loading}
        description="Cancel this invoice? This cannot be undone."
        confirmText="Cancel Invoice" destructive
      />
    </>
  );
}

interface Props {
  organizers: OrganizerOption[];
}

export function InvoicesTable({ organizers }: Props) {
  const [rows,    setRows]    = React.useState<InvoiceRow[]>([]);
  const [total,   setTotal]   = React.useState(0);
  const [page,    setPage]    = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const [filterOrganizer,  setFilterOrganizer]  = React.useState("");
  const [filterStatus,     setFilterStatus]     = React.useState("");
  const [filterService,    setFilterService]    = React.useState("");

  /* Mark-as-paid dialog state */
  const [payTarget, setPayTarget] = React.useState<{ id: string; label: string } | null>(null);

  const pageSize = 25;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterOrganizer) params.set("organizerId",  filterOrganizer);
    if (filterStatus)    params.set("status",        filterStatus);
    if (filterService)   params.set("serviceType",   filterService);

    try {
      const res  = await fetch(`/api/v1/admin/invoices?${params}`);
      const json = await res.json();
      if (res.ok) { setRows(json.data); setTotal(json.meta.total); }
    } finally {
      setLoading(false);
    }
  }, [page, filterOrganizer, filterStatus, filterService]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterOrganizer || "__all__"} onValueChange={v => { setFilterOrganizer(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Organizers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Organizers</SelectItem>
            {organizers.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterService || "__all__"} onValueChange={v => { setFilterService(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Services</SelectItem>
            {Object.entries(SERVICE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus || "__all__"} onValueChange={v => { setFilterStatus(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={fetchData} title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
        <span className="ml-auto text-sm text-gray-500">{total} invoice{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-warm-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Organizer</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {loading && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No invoices found</td></tr>
              )}
              {!loading && rows.map(row => (
                <tr key={row.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.organizer.name}</div>
                    <div className="text-xs text-gray-400">{row.organizer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 max-w-[140px] truncate">{row.event.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{row.event.tier}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700">{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</span>
                    {row.description && (
                      <div className="text-xs text-gray-400 max-w-[110px] truncate">{row.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {fmt(row.amount, row.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {row.dueDate ? fmtDate(row.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {row.payment ? (
                      <div>
                        <div className="font-medium capitalize">{row.payment.paymentMethod.replace("_", " ")}</div>
                        <div className="text-gray-400">{fmtDate(row.payment.paidAt)}</div>
                        {row.payment.referenceNumber && (
                          <div className="text-gray-400 font-mono">{row.payment.referenceNumber}</div>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {fmtDate(row.createdAt)}
                    <div className="text-gray-300">{row.createdByUser.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {row.status === "pending" && (
                        <>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs text-green-600 hover:bg-green-50 gap-1"
                            onClick={() => setPayTarget({
                              id:    row.id,
                              label: `${row.event.name} — ${SERVICE_LABELS[row.serviceType] ?? row.serviceType} (${fmt(row.amount, row.currencyCode)})`,
                            })}
                          >
                            <CheckCircle2 size={13} /> Pay
                          </Button>
                          <CancelInvoiceButton id={row.id} onDone={fetchData} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-100 bg-warm-50">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}         onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Mark as paid dialog */}
      {payTarget && (
        <MarkInvoicePaidDialog
          invoiceId={payTarget.id}
          invoiceLabel={payTarget.label}
          open={true}
          onClose={() => setPayTarget(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
