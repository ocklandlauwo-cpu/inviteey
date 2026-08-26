"use client";

import * as React from "react";
import { Plus, Wallet, Pencil, Trash2, Search, Phone, Mail, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Input }  from "@/components/ui/input";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { SetBudgetDialog } from "./set-budget-dialog";
import {
  VendorDialog, type Vendor,
  CATEGORY_LABEL, PAYMENT_STATUS_LABEL, DELIVERY_STATUS_LABEL,
} from "./vendor-dialog";

interface Budget {
  totalBudget: string | null;
  notes:       string | null;
}

interface Props {
  eventId: number;
  budget:  Budget | null;
  vendors: Vendor[];
}

const PAYMENT_VARIANT: Record<string, "success" | "warning" | "error"> = {
  fully_paid:     "success",
  partially_paid: "warning",
  unpaid:         "error",
};

const PAYMENT_FILTERS: { value: "all" | "unpaid" | "partially_paid" | "fully_paid"; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "unpaid",         label: "Unpaid" },
  { value: "partially_paid", label: "Partial Paid" },
  { value: "fully_paid",     label: "Full Paid" },
];

const DELIVERY_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "outline"> = {
  completed:      "success",
  in_progress:    "info",
  confirmed:      "outline",
  issue_reported: "error",
};

function formatAmount(amount: string | number | null) {
  if (amount == null) return "—";
  const num = typeof amount === "string" ? parseInt(amount) : amount;
  if (isNaN(num)) return "—";
  return `${num.toLocaleString("en")} TZS`;
}

export function BudgetClient({ eventId, budget: initialBudget, vendors: initialVendors }: Props) {
  const { toast } = useToast();
  const [budget, setBudget]   = React.useState(initialBudget);
  const [vendors, setVendors] = React.useState(initialVendors);
  const [settingBudget, setSettingBudget] = React.useState(false);
  const [adding, setAdding]     = React.useState(false);
  const [editing, setEditing]   = React.useState<Vendor | null>(null);
  const [deleting, setDeleting] = React.useState<Vendor | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [search, setSearch]   = React.useState("");
  const [filter, setFilter]   = React.useState<"all" | "unpaid" | "partially_paid" | "fully_paid">("all");
  const [page, setPage]       = React.useState(1);

  const totalEstimated = vendors.reduce((s, v) => s + (v.estimatedCost ? parseInt(v.estimatedCost) : 0), 0);
  const totalAgreed    = vendors.reduce((s, v) => s + (v.agreedCost ? parseInt(v.agreedCost) : 0), 0);
  const totalBudgetNum = budget?.totalBudget ? parseInt(budget.totalBudget) : 0;
  const remaining      = totalBudgetNum - totalAgreed;

  const filtered = vendors.filter(v => {
    const matchesFilter = filter === "all" || v.paymentStatus === filter;
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      CATEGORY_LABEL[v.category]?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, filter]);

  async function refreshBudget() {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/budget`);
      const json = await res.json();
      if (res.ok) setBudget(json.data);
    } catch { /* silent */ }
  }

  async function refreshVendors() {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/budget/vendors`);
      const json = await res.json();
      if (res.ok) setVendors(json.data);
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/budget/vendors/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Vendor removed" });
      setDeleting(null);
      refreshVendors();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-extrabold text-gray-900">Budget</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSettingBudget(true)} variant="outline" size="sm" className="gap-2">
            <Wallet size={14} /> {budget?.totalBudget ? "Edit Budget" : "Set Budget"}
          </Button>
          <Button onClick={() => setAdding(true)} className="bg-amber-600 hover:bg-amber-700 text-white gap-2" size="sm">
            <Plus size={14} /> Add Budget Item
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Budget</p>
          <p className="text-xl font-extrabold text-gray-900">{formatAmount(budget?.totalBudget ?? null)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Estimated</p>
          <p className="text-xl font-extrabold text-amber-700">{formatAmount(totalEstimated)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Agreed</p>
          <p className="text-xl font-extrabold text-blue-700">{formatAmount(totalAgreed)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
          <p className={`text-xl font-extrabold ${remaining < 0 ? "text-red-600" : "text-green-700"}`}>
            {budget?.totalBudget ? formatAmount(remaining) : "—"}
          </p>
        </div>
      </div>

      {budget?.notes && (
        <p className="text-sm text-gray-500 bg-warm-50 rounded-xl border border-warm-200 px-4 py-2">{budget.notes}</p>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by vendor or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {PAYMENT_FILTERS.map(f => (
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

      {/* Vendors table */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
          <Store size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No vendors yet</p>
          <p className="text-sm text-gray-400 mt-1">Track vendor costs, payments, and delivery status.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">No vendors match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Estimated</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agreed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Delivery</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(vendor => (
                    <tr key={vendor.id} className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{vendor.name}</div>
                        {vendor.serviceDescription && (
                          <div className="text-xs text-gray-400">{vendor.serviceDescription}</div>
                        )}
                        {(vendor.contactPhone || vendor.contactEmail) && (
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            {vendor.contactPhone && (
                              <span className="flex items-center gap-1"><Phone size={10} />{vendor.contactPhone}</span>
                            )}
                            {vendor.contactEmail && (
                              <span className="flex items-center gap-1"><Mail size={10} />{vendor.contactEmail}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{CATEGORY_LABEL[vendor.category] ?? vendor.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-gray-500">{formatAmount(vendor.estimatedCost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAmount(vendor.agreedCost)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={PAYMENT_VARIANT[vendor.paymentStatus] ?? "outline"} className="text-xs">
                          {PAYMENT_STATUS_LABEL[vendor.paymentStatus] ?? vendor.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={DELIVERY_VARIANT[vendor.deliveryStatus] ?? "outline"} className="text-xs">
                          {DELIVERY_STATUS_LABEL[vendor.deliveryStatus] ?? vendor.deliveryStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEditing(vendor)}>
                            <Pencil size={12} />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => setDeleting(vendor)}>
                            <Trash2 size={12} />
                          </Button>
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
      )}

      <SetBudgetDialog
        open={settingBudget}
        onClose={() => setSettingBudget(false)}
        onSaved={() => { refreshBudget(); setSettingBudget(false); }}
        eventId={eventId}
        current={budget}
      />

      <VendorDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => { refreshVendors(); setAdding(false); }}
        eventId={eventId}
      />

      {editing && (
        <VendorDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={() => { refreshVendors(); setEditing(null); }}
          eventId={eventId}
          vendor={editing}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
          title="Remove vendor"
          description={`Are you sure you want to remove "${deleting.name}"? This cannot be undone.`}
          confirmText="Remove"
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
