"use client";

import * as React from "react";
import {
  Calendar, MapPin, Package, CheckCircle2, AlertTriangle,
  Clock, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge }    from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface EventInfo {
  id:        number;
  name:      string;
  eventDate: string;
  venueName: string;
  status:    string;
  type:      string;
}

interface VendorRow {
  id:                 number;
  name:               string;
  category:           string;
  serviceDescription: string | null;
  estimatedCost:      number | null;
  agreedCost:         number | null;
  currencyCode:       string;
  paymentStatus:      string;
  deliveryStatus:     string;
  contactPhone:       string | null;
  notes:              string | null;
  event:              EventInfo;
}

interface Props {
  vendorName: string;
  vendors:    VendorRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  catering:       "Catering",
  photography:    "Photography",
  decoration:     "Decoration",
  cake_champagne: "Cake & Champagne",
  food:           "Food",
  drinks:         "Drinks",
  transport:      "Transport",
  venue:          "Venue",
  other:          "Other",
};

const DELIVERY_LABELS: Record<string, string> = {
  confirmed:       "Confirmed",
  in_progress:     "In Progress",
  completed:       "Completed",
  issue_reported:  "Issue Reported",
};

const DELIVERY_VARIANT: Record<string, "outline"|"info"|"success"|"error"> = {
  confirmed:      "outline",
  in_progress:    "info",
  completed:      "success",
  issue_reported: "error",
};

const PAYMENT_VARIANT: Record<string, "error"|"warning"|"success"> = {
  unpaid:         "error",
  partially_paid: "warning",
  fully_paid:     "success",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid:         "Unpaid",
  partially_paid: "Partial",
  fully_paid:     "Paid",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:       "Wedding",
  birthday:      "Birthday",
  sendoff:       "Sendoff",
  kitchen_party: "Kitchen Party",
  corporate:     "Corporate",
  fundraising:   "Fundraising",
  other:         "Other",
};

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-TZ", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(amount);
}

export function VendorDashboardClient({ vendorName, vendors: initial }: Props) {
  const { toast } = useToast();
  const [vendors,   setVendors]  = React.useState(initial);
  const [expanded,  setExpanded] = React.useState<Set<number>>(new Set());
  const [updating,  setUpdating] = React.useState<number | null>(null);

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function updateStatus(vendorId: number, deliveryStatus: string) {
    setUpdating(vendorId);
    try {
      const res  = await fetch(`/api/v1/vendor/assignments/${vendorId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deliveryStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error, variant: "destructive" }); return; }
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, deliveryStatus } : v));
      toast({ title: "Status updated" });
    } finally {
      setUpdating(null);
    }
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-20">
        <Package size={40} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">No assignments yet</h2>
        <p className="text-sm text-gray-400 mt-1">
          Your event assignments will appear here once an organizer adds you to an event.
        </p>
      </div>
    );
  }

  const upcoming  = vendors.filter(v => new Date(v.event.eventDate) >= new Date());
  const past      = vendors.filter(v => new Date(v.event.eventDate) <  new Date());

  function renderSection(list: VendorRow[], label: string) {
    if (list.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h2>
        {list.map(v => {
          const isExpanded = expanded.has(v.id);
          return (
            <div key={v.id} className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggle(v.id)}
                className="w-full px-5 py-4 flex items-start justify-between gap-4 hover:bg-warm-50/40 transition-colors text-left"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{v.event.name}</span>
                    <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[v.event.type] ?? v.event.type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(v.event.eventDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {v.event.venueName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-xs font-medium text-gray-700">{CATEGORY_LABELS[v.category] ?? v.category}</span>
                    <Badge variant={DELIVERY_VARIANT[v.deliveryStatus] ?? "outline"} className="text-xs">
                      {DELIVERY_LABELS[v.deliveryStatus] ?? v.deliveryStatus}
                    </Badge>
                    <Badge variant={PAYMENT_VARIANT[v.paymentStatus] ?? "outline"} className="text-xs">
                      {PAYMENT_LABELS[v.paymentStatus] ?? v.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-gray-400 mt-1">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-warm-100 px-5 py-4 space-y-4 bg-warm-50/30">
                  {v.serviceDescription && (
                    <p className="text-sm text-gray-600">{v.serviceDescription}</p>
                  )}

                  {/* Costs */}
                  {(v.estimatedCost || v.agreedCost) && (
                    <div className="grid grid-cols-2 gap-3">
                      {v.estimatedCost && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Estimated</p>
                          <p className="font-semibold text-gray-800">{fmt(v.estimatedCost, v.currencyCode)}</p>
                        </div>
                      )}
                      {v.agreedCost && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Agreed</p>
                          <p className="font-semibold text-gray-800">{fmt(v.agreedCost, v.currencyCode)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {v.notes && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes from organizer</p>
                      <p className="text-sm text-amber-800">{v.notes}</p>
                    </div>
                  )}

                  {/* Update delivery status */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600">Update Delivery Status</p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={v.deliveryStatus}
                        disabled={updating === v.id}
                        onValueChange={val => updateStatus(v.id, val)}
                      >
                        <SelectTrigger className="w-48 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DELIVERY_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updating === v.id && <Loader2 size={14} className="animate-spin text-amber-600" />}
                    </div>
                    <p className="text-xs text-gray-400">
                      The organizer will see this update in their vendor dashboard.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Welcome, {vendorName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your event assignments and delivery status</p>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { icon: Clock,         label: "Upcoming",  value: upcoming.length,                                            color: "text-amber-600 bg-amber-50" },
          { icon: CheckCircle2,  label: "Completed", value: vendors.filter(v => v.deliveryStatus === "completed").length, color: "text-green-600 bg-green-50" },
          { icon: AlertTriangle, label: "Issues",    value: vendors.filter(v => v.deliveryStatus === "issue_reported").length, color: "text-red-600 bg-red-50" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${s.color}`}>
            <s.icon size={15} />
            <span className="text-sm font-semibold">{s.value} {s.label}</span>
          </div>
        ))}
      </div>

      {renderSection(upcoming, "Upcoming Events")}
      {renderSection(past,     "Past Events")}
    </div>
  );
}
