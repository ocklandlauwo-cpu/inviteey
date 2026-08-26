"use client";

import * as React from "react";
import {
  Download, Users, CheckCircle2, XCircle, Clock, UserCheck,
  HandCoins, Bell, Mail, MessageSquare, Phone, AlertCircle,
} from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ─── types ─────────────────────────────────────────────────────────── */

interface InviteeRow {
  category:      string;
  rsvpStatus:    string;
  checkinStatus: string;
}

interface PledgeStats {
  pledgeCount:    number;
  totalPledged:   number;
  totalCollected: number;
}

interface NotifRow {
  id:             number;
  channel:        string;
  recipientGroup: string;
  message:        string;
  status:         string;
  sentAt:         string | null;
  createdAt:      string;
  total:          number;
  delivered:      number;
  failed:         number;
}

interface Props {
  eventId:          number;
  invitees:         InviteeRow[];
  hasContributions: boolean;
  hasExportCsv:     boolean;
  pledgeStats:      PledgeStats;
  notifications:    NotifRow[];
}

/* ─── constants ──────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  family:     "Family",
  friends:    "Friends",
  colleagues: "Colleagues",
  vip:        "VIP",
  other:      "Other",
};

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email:     Mail,
  sms:       Phone,
  whatsapp:  MessageSquare,
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp",
};

const GROUP_LABEL: Record<string, string> = {
  all:         "All guests",
  by_category: "By category",
  by_status:   "By status",
  selected:    "Selected guests",
};

function fmt(n: number) { return n.toLocaleString("en"); }
function fmtAmt(n: number) { return `${n.toLocaleString("en")} TZS`; }
function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0; }

/* ─── shared summary stat card ──────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-4">
      <p className={`text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5`}>
        <Icon size={12} className={color} /> {label}
      </p>
      <p className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── progress bar row ───────────────────────────────────────────────── */

function BarRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right shrink-0">{count}</span>
      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{p}%</span>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────── */

export function ReportsClient({
  eventId, invitees, hasContributions, hasExportCsv, pledgeStats, notifications,
}: Props) {
  const total      = invitees.length;
  const confirmed  = invitees.filter(i => i.rsvpStatus    === "confirmed").length;
  const declined   = invitees.filter(i => i.rsvpStatus    === "declined").length;
  const pending    = invitees.filter(i => i.rsvpStatus    === "pending").length;
  const checkedIn  = invitees.filter(i => i.checkinStatus === "checked_in").length;
  const notArrived = total - checkedIn;

  const categories = ["family", "friends", "colleagues", "vip", "other"].map(cat => {
    const inCat = invitees.filter(i => i.category === cat);
    return {
      key:       cat,
      total:     inCat.length,
      confirmed: inCat.filter(i => i.rsvpStatus    === "confirmed").length,
      checkedIn: inCat.filter(i => i.checkinStatus === "checked_in").length,
    };
  }).filter(c => c.total > 0);

  return (
    <Tabs defaultValue="rsvp" className="space-y-5">
      <TabsList className="bg-warm-50 border border-warm-200 h-auto p-1 gap-1 flex flex-wrap">
        <TabsTrigger value="rsvp"          className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 rounded-lg px-4 py-2 text-sm font-medium">RSVP</TabsTrigger>
        <TabsTrigger value="attendance"    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 rounded-lg px-4 py-2 text-sm font-medium">Attendance</TabsTrigger>
        <TabsTrigger value="contributions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 rounded-lg px-4 py-2 text-sm font-medium" disabled={!hasContributions}>Contributions</TabsTrigger>
        <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 rounded-lg px-4 py-2 text-sm font-medium">Notifications</TabsTrigger>
      </TabsList>

      {/* ── RSVP tab ── */}
      <TabsContent value="rsvp" className="space-y-5 mt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}        label="Total Guests" value={fmt(total)}     color="text-gray-700" />
          <StatCard icon={CheckCircle2} label="Confirmed"    value={fmt(confirmed)} sub={`${pct(confirmed,total)}%`} color="text-green-600" />
          <StatCard icon={XCircle}      label="Declined"     value={fmt(declined)}  sub={`${pct(declined,total)}%`}  color="text-red-500"   />
          <StatCard icon={Clock}        label="Pending"      value={fmt(pending)}   sub={`${pct(pending,total)}%`}   color="text-gray-500"  />
        </div>

        <div className="bg-white rounded-2xl border border-warm-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900">RSVP Breakdown</p>
            {hasExportCsv && (
              <a href={`/api/v1/events/${eventId}/reports/export`} download>
                <Button size="sm" variant="outline" className="gap-2 text-xs">
                  <Download size={12} /> Export CSV
                </Button>
              </a>
            )}
          </div>
          {total === 0 ? (
            <p className="text-sm text-gray-400">No guests added yet.</p>
          ) : (
            <div className="space-y-3">
              <BarRow label="Confirmed" count={confirmed} total={total} color="bg-green-500" />
              <BarRow label="Declined"  count={declined}  total={total} color="bg-red-400"   />
              <BarRow label="Pending"   count={pending}   total={total} color="bg-gray-300"  />
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-warm-100 bg-warm-50">
              <p className="text-sm font-semibold text-gray-900">RSVP by Category</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Confirmed</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Declined</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => {
                    const declined_ = invitees.filter(i => i.category === cat.key && i.rsvpStatus === "declined").length;
                    const pending_  = cat.total - cat.confirmed - declined_;
                    return (
                      <tr key={cat.key} className="border-b border-warm-50 last:border-0">
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[cat.key] ?? cat.key}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{cat.total}</td>
                        <td className="px-4 py-2.5 text-right text-green-600">{cat.confirmed}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{declined_}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400">{pending_}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── Attendance tab ── */}
      <TabsContent value="attendance" className="space-y-5 mt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Users}     label="Total Guests"  value={fmt(total)}      color="text-gray-700"  />
          <StatCard icon={UserCheck} label="Checked In"    value={fmt(checkedIn)}  sub={`${pct(checkedIn,total)}% of all guests`} color="text-blue-600" />
          <StatCard icon={Clock}     label="Not Arrived"   value={fmt(notArrived)} sub={`of ${fmt(confirmed)} RSVP confirmed`}   color="text-gray-400" />
        </div>

        <div className="bg-white rounded-2xl border border-warm-200 p-5">
          <p className="font-semibold text-gray-900 mb-4">Check-in Progress</p>
          {total === 0 ? (
            <p className="text-sm text-gray-400">No guests added yet.</p>
          ) : (
            <div className="space-y-3">
              <BarRow label="Checked In"  count={checkedIn}  total={total} color="bg-blue-500" />
              <BarRow label="Not Arrived" count={notArrived} total={total} color="bg-gray-300" />
            </div>
          )}
          {confirmed > 0 && (
            <p className="text-xs text-gray-400 mt-4">
              {checkedIn} of {confirmed} RSVP-confirmed guests attended ({pct(checkedIn, confirmed)}% show-up rate).
            </p>
          )}
        </div>

        {categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-warm-100 bg-warm-50">
              <p className="text-sm font-semibold text-gray-900">Attendance by Category</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Confirmed</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Checked In</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Show-up Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.key} className="border-b border-warm-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[cat.key] ?? cat.key}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{cat.total}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{cat.confirmed}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600">{cat.checkedIn}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {cat.confirmed > 0 ? `${pct(cat.checkedIn, cat.confirmed)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── Contributions tab ── */}
      <TabsContent value="contributions" className="space-y-5 mt-0">
        {!hasContributions ? (
          <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
            <HandCoins size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Contributions tracking is not available on your current plan.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard icon={HandCoins}   label="Total Pledges"    value={fmt(pledgeStats.pledgeCount)} color="text-amber-600" />
              <StatCard icon={CheckCircle2} label="Total Pledged"   value={fmtAmt(pledgeStats.totalPledged)}   color="text-amber-700" />
              <StatCard icon={UserCheck}    label="Total Collected" value={fmtAmt(pledgeStats.totalCollected)} color="text-green-600"
                sub={pledgeStats.totalPledged > 0 ? `${pct(pledgeStats.totalCollected, pledgeStats.totalPledged)}% collected` : undefined}
              />
            </div>

            <div className="bg-white rounded-2xl border border-warm-200 p-5">
              <p className="font-semibold text-gray-900 mb-4">Collection Progress</p>
              {pledgeStats.pledgeCount === 0 ? (
                <p className="text-sm text-gray-400">No pledges recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  <BarRow label="Collected" count={pledgeStats.totalCollected} total={pledgeStats.totalPledged} color="bg-green-500" />
                  <BarRow label="Outstanding" count={pledgeStats.totalPledged - pledgeStats.totalCollected} total={pledgeStats.totalPledged} color="bg-amber-300" />
                </div>
              )}
            </div>
          </>
        )}
      </TabsContent>

      {/* ── Notifications tab ── */}
      <TabsContent value="notifications" className="space-y-5 mt-0">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
            <Bell size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No notifications have been sent for this event yet.</p>
            <p className="text-xs text-gray-400 mt-1">Contact the Invitee team to compose and send notifications to your guests.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={Bell}         label="Campaigns"   value={notifications.length}                                       color="text-amber-600" />
              <StatCard icon={CheckCircle2} label="Delivered"   value={notifications.reduce((s,n) => s + n.delivered, 0)}         color="text-green-600" />
              <StatCard icon={AlertCircle}  label="Failed"      value={notifications.reduce((s,n) => s + n.failed,    0)}         color="text-red-500"   />
            </div>

            <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-warm-100 bg-warm-50">
                <p className="text-sm font-semibold text-gray-900">Campaign History</p>
              </div>
              <div className="divide-y divide-warm-50">
                {notifications.map(n => {
                  const Icon    = CHANNEL_ICON[n.channel] ?? Bell;
                  const pending = n.total - n.delivered - n.failed;
                  return (
                    <div key={n.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {CHANNEL_LABEL[n.channel] ?? n.channel} · {GROUP_LABEL[n.recipientGroup] ?? n.recipientGroup}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={n.status === "completed" ? "success" : n.status === "failed" ? "error" : "outline"} className="text-xs">
                            {n.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {n.sentAt
                              ? new Date(n.sentAt).toLocaleDateString("en-TZ", { day:"numeric", month:"short", year:"numeric" })
                              : new Date(n.createdAt).toLocaleDateString("en-TZ", { day:"numeric", month:"short", year:"numeric" })}
                          </span>
                        </div>
                      </div>

                      {n.total > 0 && (
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> {n.delivered} delivered</span>
                          <span className="flex items-center gap-1"><AlertCircle  size={11} className="text-red-400"   /> {n.failed} failed</span>
                          {pending > 0 && <span className="flex items-center gap-1"><Clock size={11} className="text-gray-400" /> {pending} pending</span>}
                          <span className="ml-auto">{n.total} total</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
