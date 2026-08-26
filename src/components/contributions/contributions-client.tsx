"use client";

import * as React from "react";
import { Plus, HandCoins, CheckCircle2, Clock, CreditCard, Search, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { AddPledgeDialog }   from "./add-pledge-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";

interface Payment {
  id:     number;
  amount: string;
  paidAt: Date | string;
  notes:  string | null;
}

interface Pledge {
  id:       number;
  inviteeId: number;
  type:     string;
  amount:   string;
  status:   string;
  notes:    string | null;
  createdAt: Date | string;
  invitee:  { id: number; name: string; phone: string | null };
  payments: Payment[];
}

interface Invitee {
  id:    number;
  name:  string;
  phone: string | null;
}

interface Props {
  eventId:  number;
  pledges:  Pledge[];
  invitees: Invitee[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error"> = {
  fully_paid:      "success",
  partially_paid:  "warning",
  unpaid:          "error",
};

const STATUS_LABEL: Record<string, string> = {
  fully_paid:     "Paid",
  partially_paid: "Partial",
  unpaid:         "Unpaid",
};

const FILTERS: { value: "all" | "unpaid" | "partially_paid" | "fully_paid"; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "partially_paid", label: "Partial" },
  { value: "fully_paid",     label: "Complete" },
  { value: "unpaid",         label: "Pending" },
];

function formatAmount(amount: string) {
  return `${parseInt(amount).toLocaleString("en")} TZS`;
}

function paidAmount(payments: Payment[]) {
  return payments.reduce((sum, p) => sum + parseInt(p.amount), 0);
}

export function ContributionsClient({ eventId, pledges: init, invitees }: Props) {
  const [pledges, setPledges]           = React.useState<Pledge[]>(init);
  const [adding, setAdding]             = React.useState(false);
  const [payingPledge, setPayingPledge] = React.useState<Pledge | null>(null);
  const [search, setSearch]             = React.useState("");
  const [filter, setFilter]             = React.useState<"all" | "unpaid" | "partially_paid" | "fully_paid">("all");
  const [page, setPage]                 = React.useState(1);
  const [expanded, setExpanded]         = React.useState<Set<number>>(new Set());

  function toggleHistory(pledgeId: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(pledgeId)) next.delete(pledgeId); else next.add(pledgeId);
      return next;
    });
  }

  const totalPledged = pledges.reduce((s, p) => s + parseInt(p.amount), 0);
  const totalPaid    = pledges.reduce((s, p) => s + paidAmount(p.payments), 0);
  const totalRemaining = totalPledged - totalPaid;
  const collectedPct  = totalPledged > 0 ? Math.round((totalPaid / totalPledged) * 100) : 0;
  const remainingPct  = totalPledged > 0 ? 100 - collectedPct : 0;

  const filtered = pledges.filter(p => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch =
      p.invitee.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.invitee.phone ?? "").includes(search);
    return matchesFilter && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, filter]);

  async function refresh() {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/pledges`);
      const json = await res.json();
      if (res.ok) setPledges(json.data);
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-5">
      {/* Heading + Add Pledge */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-900">Contributions</h1>
        <Button
          onClick={() => setAdding(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          size="sm"
        >
          <Plus size={14} /> Add Pledge
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pledges</p>
          <p className="text-2xl font-extrabold text-gray-900">{pledges.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Pledged</p>
          <p className="text-xl font-extrabold text-amber-700">{formatAmount(totalPledged.toString())}</p>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Collected</p>
          <p className="text-xl font-extrabold text-green-700">{formatAmount(totalPaid.toString())}</p>
          {totalPledged > 0 && (
            <p className="text-xs text-gray-400 mt-1">{collectedPct}% collected</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining</p>
          <p className="text-xl font-extrabold text-red-600">{formatAmount(totalRemaining.toString())}</p>
          {totalPledged > 0 && (
            <p className="text-xs text-gray-400 mt-1">{remainingPct}% remaining</p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by guest name or phone…"
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

      {/* Pledges table */}
      {pledges.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
          <HandCoins size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No pledges yet</p>
          <p className="text-sm text-gray-400 mt-1">Track guest contributions and payment status.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">No pledges match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pledged</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Remaining</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(pledge => {
                    const paid      = paidAmount(pledge.payments);
                    const pledgeAmt = parseInt(pledge.amount);
                    const remaining = pledgeAmt - paid;

                    return (
                      <React.Fragment key={pledge.id}>
                      <tr className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{pledge.invitee.name}</div>
                          {pledge.invitee.phone && (
                            <div className="text-xs text-gray-400">{pledge.invitee.phone}</div>
                          )}
                          {pledge.notes && (
                            <div className="text-xs text-gray-400 mt-0.5">{pledge.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500 capitalize">{pledge.type}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAmount(pledge.amount)}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          {paid > 0 ? (
                            <span className="text-green-700 font-medium">{formatAmount(paid.toString())}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          {pledge.status === "fully_paid" ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className="text-gray-500 flex items-center justify-end gap-1">
                              <Clock size={11} /> {formatAmount(remaining.toString())}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[pledge.status]} className="text-xs">
                            {STATUS_LABEL[pledge.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {paid > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => toggleHistory(pledge.id)}
                              >
                                <History size={12} />
                                History
                                {expanded.has(pledge.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </Button>
                            )}
                            {pledge.status === "fully_paid" ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => setPayingPledge(pledge)}
                              >
                                <CreditCard size={12} />
                                Record Payment
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded.has(pledge.id) && (
                        <tr className="border-b border-warm-50 bg-warm-50/40">
                          <td colSpan={7} className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Payment History — {pledge.invitee.name}
                            </p>
                            <div className="space-y-1.5">
                              {pledge.payments
                                .slice()
                                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                                .map(p => (
                                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-warm-100 px-3 py-2 text-xs">
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <Clock size={11} />
                                      {new Date(p.paidAt).toLocaleDateString("en-TZ", { day: "numeric", month: "short", year: "numeric" })}
                                      {p.notes && <span className="text-gray-400">· {p.notes}</span>}
                                    </div>
                                    <span className="font-semibold text-green-700">{formatAmount(p.amount)}</span>
                                  </div>
                                ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <AddPledgeDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => { refresh(); setAdding(false); }}
        eventId={eventId}
        invitees={invitees}
      />

      {payingPledge && (
        <RecordPaymentDialog
          open={!!payingPledge}
          onClose={() => setPayingPledge(null)}
          onRecorded={() => { refresh(); setPayingPledge(null); }}
          eventId={eventId}
          pledge={payingPledge}
        />
      )}
    </div>
  );
}
