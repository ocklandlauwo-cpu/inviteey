"use client";

import * as React from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function DeleteButton({ id, label, onDeleted }: { id: string; label: string; onDeleted: () => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    setLoading(true);
    const res = await fetch(`/api/v1/admin/payments/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Payment deleted" });
      setOpen(false);
      onDeleted();
    } else {
      toast({ title: "Error deleting payment", variant: "destructive" });
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => setOpen(true)}>
        <Trash2 size={14} />
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Delete Payment"
        description={`Delete this payment (${label})? This action cannot be undone.`}
        confirmText="Delete"
        destructive
        loading={loading}
      />
    </>
  );
}
import {
  RecordPlatformPaymentDialog,
  type OrganizerOption,
} from "@/components/admin/record-platform-payment-dialog";

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

const METHOD_LABELS: Record<string, string> = {
  mpesa:         "M-Pesa",
  tigopesa:      "Tigo Pesa",
  airtel_money:  "Airtel Money",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
  other:         "Other",
};

const SERVICE_TYPES = [
  "tier_standard","tier_premium","tier_royal",
  "sms_notification","whatsapp_notification","ecard_service","extra_invitees","other",
];

const PAYMENT_METHODS = ["mpesa","tigopesa","airtel_money","bank_transfer","cash","other"];

interface PaymentRow {
  id: string;
  organizerId: number;
  eventId: number | null;
  serviceType: string;
  description: string | null;
  amount: number;
  currencyCode: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  paidAt: string;
  notes: string | null;
  organizer: { id: number; name: string; email: string };
  event: { id: number; name: string; type: string; tier: string } | null;
  confirmedByUser: { id: number; name: string };
}

interface Props {
  organizers: OrganizerOption[];
}

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en")}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function PlatformPaymentsTable({ organizers }: Props) {
  const [rows,    setRows]    = React.useState<PaymentRow[]>([]);
  const [total,   setTotal]   = React.useState(0);
  const [page,    setPage]    = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const [filterOrganizer,   setFilterOrganizer]   = React.useState("");
  const [filterServiceType, setFilterServiceType] = React.useState("");
  const [filterMethod,      setFilterMethod]      = React.useState("");
  const [filterStatus,      setFilterStatus]      = React.useState("");

  const pageSize = 25;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterOrganizer)   params.set("organizerId",   filterOrganizer);
    if (filterServiceType) params.set("serviceType",   filterServiceType);
    if (filterMethod)      params.set("paymentMethod", filterMethod);
    if (filterStatus)      params.set("status",        filterStatus);

    try {
      const res  = await fetch(`/api/v1/admin/payments?${params}`);
      const json = await res.json();
      if (res.ok) { setRows(json.data); setTotal(json.meta.total); }
    } finally {
      setLoading(false);
    }
  }, [page, filterOrganizer, filterServiceType, filterMethod, filterStatus]);

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
            {organizers.map(o => (
              <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterServiceType || "__all__"} onValueChange={v => { setFilterServiceType(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Services</SelectItem>
            {SERVICE_TYPES.map(s => (
              <SelectItem key={s} value={s}>{SERVICE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMethod || "__all__"} onValueChange={v => { setFilterMethod(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Methods" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Methods</SelectItem>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus || "__all__"} onValueChange={v => { setFilterStatus(v === "__all__" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={fetchData} title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>

        <span className="ml-auto text-sm text-gray-500">{total} payment{total !== 1 ? "s" : ""}</span>
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
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Ref #</th>
                <th className="px-4 py-3 text-left">Paid At</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {loading && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No payments found</td></tr>
              )}
              {!loading && rows.map(row => (
                <tr key={row.id} className="hover:bg-warm-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.organizer.name}</div>
                    <div className="text-xs text-gray-400">{row.organizer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.event ? (
                      <div>
                        <div className="font-medium text-gray-800 truncate max-w-[140px]">{row.event.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{row.event.tier}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700">{SERVICE_LABELS[row.serviceType] ?? row.serviceType}</span>
                    {row.description && (
                      <div className="text-xs text-gray-400 truncate max-w-[120px]">{row.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {fmt(row.amount, row.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.referenceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(row.paidAt)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={row.status === "confirmed"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{row.confirmedByUser.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <RecordPlatformPaymentDialog
                        organizers={organizers}
                        onSuccess={fetchData}
                        existing={{
                          id:              row.id,
                          organizerId:     row.organizerId,
                          eventId:         row.eventId,
                          serviceType:     row.serviceType,
                          description:     row.description,
                          amount:          row.amount,
                          currencyCode:    row.currencyCode,
                          paymentMethod:   row.paymentMethod,
                          referenceNumber: row.referenceNumber,
                          status:          row.status,
                          paidAt:          row.paidAt,
                          notes:           row.notes,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-600">
                            <Pencil size={14} />
                          </Button>
                        }
                      />
                      <DeleteButton
                        id={row.id}
                        label={`${SERVICE_LABELS[row.serviceType] ?? row.serviceType} — ${fmt(row.amount, row.currencyCode)}`}
                        onDeleted={fetchData}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-warm-100 bg-warm-50">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
