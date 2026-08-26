"use client";

import * as React from "react";
import {
  Mail, MessageSquare, Phone, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  RefreshCw, Loader2, Bell, Users, RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface RecipientInvitee {
  id:    number;
  name:  string;
  phone: string | null;
  email: string | null;
}

interface Recipient {
  id:      number;
  status:  string;
  invitee: RecipientInvitee;
}

interface NotificationSession {
  id:             number;
  channel:        string;
  recipientGroup: string;
  subject:        string | null;
  message:        string;
  status:         string;
  sentAt:         Date | string | null;
  createdAt:      Date | string;
  recipients:     Recipient[];
}

interface Props {
  eventId:              number;
  initialNotifications: NotificationSession[];
}

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail, sms: Phone, whatsapp: MessageSquare,
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

const SESSION_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "outline"> = {
  completed:  "success",
  partial:    "warning",
  processing: "info",
  pending:    "outline",
  failed:     "error",
};

const SESSION_STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  partial:   "Partial",
  processing: "Processing",
  pending:   "Pending",
  failed:    "Failed",
};

const RECIPIENT_STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "outline"> = {
  delivered: "success",
  sent:      "success",
  pending:   "warning",
  failed:    "error",
};

const RECIPIENT_STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered", sent: "Sent", pending: "Pending", failed: "Failed",
};

function sessionStats(recipients: Recipient[]) {
  const total  = recipients.length;
  const sent   = recipients.filter(r => r.status === "sent" || r.status === "delivered").length;
  const failed = recipients.filter(r => r.status === "failed").length;
  return { total, sent, failed };
}

const CHANNELS = ["email", "sms", "whatsapp"] as const;

export function NotificationStatusClient({ eventId, initialNotifications }: Props) {
  const { toast } = useToast();
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [refreshing, setRefreshing]       = React.useState(false);
  const [channelFilter, setChannelFilter] = React.useState<"all" | "email" | "sms" | "whatsapp">("all");
  const [expanded, setExpanded]           = React.useState<Set<number>>(new Set());
  const [page, setPage]                   = React.useState(1);
  const [retrying, setRetrying]           = React.useState<Set<string>>(new Set());

  const summary = CHANNELS.map(channel => ({
    channel,
    ...sessionStats(notifications.filter(n => n.channel === channel).flatMap(n => n.recipients)),
  }));

  const filtered = channelFilter === "all"
    ? notifications
    : notifications.filter(n => n.channel === channelFilter);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [channelFilter]);

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/notifications`);
      const json = await res.json();
      if (res.ok) setNotifications(json.data);
    } catch { /* silent */ } finally {
      setRefreshing(false);
    }
  }

  async function retry(notificationId: number, recipientIds?: number[]) {
    const key = recipientIds ? `${notificationId}:${recipientIds.join(",")}` : `${notificationId}`;
    setRetrying(prev => new Set(prev).add(key));
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/notifications/${notificationId}/retry`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(recipientIds ? { recipientIds } : {}),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }

      setNotifications(prev => prev.map(n => {
        if (n.id !== notificationId) return n;
        return {
          ...n,
          status: "processing",
          recipients: n.recipients.map(r =>
            r.status === "failed" && (!recipientIds || recipientIds.includes(r.id))
              ? { ...r, status: "pending" }
              : r
          ),
        };
      }));
      toast({ title: `Retrying ${json.retried} ${json.retried === 1 ? "recipient" : "recipients"}…` });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setRetrying(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* Channel summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.map(s => {
          const Icon = CHANNEL_ICON[s.channel];
          return (
            <div key={s.channel} className="bg-white rounded-2xl border border-warm-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Icon size={14} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{CHANNEL_LABEL[s.channel]}</p>
              </div>
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-xl font-extrabold text-green-600">{s.sent}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Sent</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-red-500">{s.failed}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Failed</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900">{s.total}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          {(["all", ...CHANNELS] as const).map(c => (
            <button
              key={c}
              onClick={() => setChannelFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                channelFilter === c
                  ? "bg-amber-600 text-white"
                  : "bg-warm-50 text-gray-500 hover:bg-warm-100"
              }`}
            >
              {c === "all" ? "All" : CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {/* Sessions */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No notifications sent yet</p>
          <p className="text-sm text-gray-400 mt-1">
            The Invitee team sends guest notifications on your behalf — delivery status will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
          <div className="divide-y divide-warm-50">
            {paged.map(notif => {
              const Icon       = CHANNEL_ICON[notif.channel];
              const stats      = sessionStats(notif.recipients);
              const isExpanded = expanded.has(notif.id);
              const displayStatus = notif.status === "completed" && stats.failed > 0 && stats.sent > 0
                ? "partial"
                : notif.status;
              return (
                <div key={notif.id}>
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">
                            {CHANNEL_LABEL[notif.channel]}
                          </span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-xs text-gray-600">{GROUP_LABEL[notif.recipientGroup] ?? notif.recipientGroup}</span>
                          <Badge variant={SESSION_STATUS_VARIANT[displayStatus] ?? "outline"} className="text-xs capitalize">
                            {SESSION_STATUS_LABEL[displayStatus] ?? displayStatus}
                          </Badge>
                        </div>
                        {notif.subject && (
                          <p className="text-sm font-medium text-gray-800 mt-1">{notif.subject}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">
                        {notif.sentAt ? formatDate(notif.sentAt, true) : formatDate(notif.createdAt, true)}
                      </p>
                      {stats.total > 0 && (
                        <div className="flex items-center gap-2 mt-1 justify-end">
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={11} />{stats.sent}
                          </span>
                          {stats.failed > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <XCircle size={11} />{stats.failed}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">/ {stats.total}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 justify-end">
                        {stats.failed > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            disabled={retrying.has(`${notif.id}`)}
                            onClick={() => retry(notif.id)}
                          >
                            {retrying.has(`${notif.id}`)
                              ? <Loader2 size={12} className="animate-spin" />
                              : <RotateCw size={12} />
                            }
                            Retry Failed ({stats.failed})
                          </Button>
                        )}
                        {stats.total > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => toggle(notif.id)}
                          >
                            <Users size={12} /> Guests
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-warm-50/40 border-t border-warm-50 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Recipients — {notif.recipients.length}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr>
                              <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Guest</th>
                              <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Contact</th>
                              <th className="text-right px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {notif.recipients.map(r => {
                              const retryKey = `${notif.id}:${r.id}`;
                              return (
                                <tr key={r.id} className="border-t border-warm-100">
                                  <td className="px-3 py-1.5 font-medium text-gray-800">{r.invitee.name}</td>
                                  <td className="px-3 py-1.5 text-xs text-gray-500 hidden sm:table-cell">
                                    {notif.channel === "email" ? (r.invitee.email ?? "—") : (r.invitee.phone ?? "—")}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    <Badge variant={RECIPIENT_STATUS_VARIANT[r.status] ?? "outline"} className="text-xs">
                                      {RECIPIENT_STATUS_LABEL[r.status] ?? r.status}
                                    </Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    {r.status === "failed" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                        disabled={retrying.has(retryKey)}
                                        onClick={() => retry(notif.id, [r.id])}
                                        title="Retry"
                                      >
                                        {retrying.has(retryKey)
                                          ? <Loader2 size={12} className="animate-spin" />
                                          : <RotateCw size={12} />
                                        }
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
