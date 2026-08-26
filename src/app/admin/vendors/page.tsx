"use client";

import * as React from "react";
import { Search, Loader2, Package } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  catering: "Catering", photography: "Photography", decoration: "Decoration",
  cake_champagne: "Cake & Champagne", food: "Food", drinks: "Drinks",
  transport: "Transport", venue: "Venue", other: "Other",
};

const DELIVERY_LABELS: Record<string, string> = {
  confirmed: "Confirmed", in_progress: "In Progress",
  completed: "Completed", issue_reported: "Issue",
};

const DELIVERY_VARIANT: Record<string, "outline"|"info"|"success"|"error"> = {
  confirmed: "outline", in_progress: "info", completed: "success", issue_reported: "error",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Unpaid", partially_paid: "Partial", fully_paid: "Paid",
};

const PAYMENT_VARIANT: Record<string, "error"|"warning"|"success"> = {
  unpaid: "error", partially_paid: "warning", fully_paid: "success",
};

interface VendorRow {
  id:             number;
  name:           string;
  category:       string;
  deliveryStatus: string;
  paymentStatus:  string;
  agreedCost:     number | null;
  currencyCode:   string;
  contactPhone:   string | null;
  contactEmail:   string | null;
  userId:         number | null;
  event:    { id: number; name: string; eventDate: string; type: string };
  organizer:{ id: number; name: string; email: string };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding", birthday: "Birthday", sendoff: "Sendoff",
  kitchen_party: "Kitchen Party", corporate: "Corporate",
  fundraising: "Fundraising", other: "Other",
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-TZ", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(amount);
}

export default function AdminVendorsPage() {
  const { toast } = useToast();
  const [vendors,         setVendors]         = React.useState<VendorRow[]>([]);
  const [loading,         setLoading]         = React.useState(true);
  const [search,          setSearch]          = React.useState("");
  const [deliveryFilter,  setDeliveryFilter]  = React.useState("all");
  const [paymentFilter,   setPaymentFilter]   = React.useState("all");
  const [page,            setPage]            = React.useState(1);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/admin/vendors");
      const json = await res.json();
      if (res.ok) setVendors(json.data);
      else toast({ title: json.error, variant: "destructive" });
    } catch {
      toast({ title: "Failed to load vendors", variant: "destructive" });
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = vendors.filter(v => {
    if (deliveryFilter !== "all" && v.deliveryStatus !== deliveryFilter) return false;
    if (paymentFilter  !== "all" && v.paymentStatus  !== paymentFilter)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.name.toLowerCase().includes(q) && !v.event.name.toLowerCase().includes(q) &&
          !v.organizer.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, deliveryFilter, paymentFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Vendors</h1>
        <p className="text-gray-500 text-sm mt-1">{vendors.length} vendors across all events</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search vendor, event, or organizer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Delivery status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery</SelectItem>
            {Object.entries(DELIVERY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-amber-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No vendors match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Organizer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Delivery</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Agreed Cost</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(v => (
                  <tr key={v.id} className="border-b border-warm-50 hover:bg-warm-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{v.name}</div>
                      {v.contactPhone && (
                        <div className="text-xs text-gray-400">{v.contactPhone}</div>
                      )}
                      {v.userId && (
                        <span className="text-xs text-amber-600 font-medium">Portal user</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[v.category] ?? v.category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 text-xs">{v.event.name}</div>
                      <div className="text-xs text-gray-400">
                        {EVENT_TYPE_LABELS[v.event.type] ?? v.event.type} · {formatDate(v.event.eventDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-gray-700">{v.organizer.name}</div>
                      <div className="text-xs text-gray-400">{v.organizer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={DELIVERY_VARIANT[v.deliveryStatus] ?? "outline"} className="text-xs">
                        {DELIVERY_LABELS[v.deliveryStatus] ?? v.deliveryStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PAYMENT_VARIANT[v.paymentStatus] ?? "outline"} className="text-xs">
                        {PAYMENT_LABELS[v.paymentStatus] ?? v.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-gray-700 font-medium text-xs">
                      {v.agreedCost ? fmt(v.agreedCost, v.currencyCode) : "—"}
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
