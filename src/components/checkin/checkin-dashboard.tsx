"use client";

import * as React from "react";
import {
  CheckCircle2, XCircle, Users, Search, RefreshCw,
  Loader2, QrCode, ScanLine, UserCheck, Undo2, KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface InviteeRow {
  id:            number;
  name:          string;
  phone:         string | null;
  category:      string;
  checkinStatus: string;
  rsvpStatus:    string;
  checkinAt:     string | null;
}

interface Summary {
  total:      number;
  checkedIn:  number;
  notArrived: number;
}

interface EventInfo {
  name:      string;
  eventDate: string | Date;
  venueName: string;
  status:    string;
}

interface Props {
  eventId:     number;
  staffToken?: string;
  staffPin?:   string;
  readOnly?:   boolean;
  embedded?:   boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  family: "Family", friends: "Friends", colleagues: "Colleagues", vip: "VIP", other: "Guest",
};

export function CheckinDashboard({ eventId, staffToken, staffPin, readOnly = false, embedded = false }: Props) {
  const { toast } = useToast();

  const [event,      setEvent]      = React.useState<EventInfo | null>(null);
  const [summary,    setSummary]    = React.useState<Summary>({ total: 0, checkedIn: 0, notArrived: 0 });
  const [invitees,   setInvitees]   = React.useState<InviteeRow[]>([]);
  const [loading,    setLoading]    = React.useState(true);
  const [search,     setSearch]     = React.useState("");
  const [statusTab,  setStatusTab]  = React.useState<"all" | "not_arrived" | "checked_in">("all");
  const [page,       setPage]       = React.useState(1);
  const [checking,   setChecking]   = React.useState<number | null>(null);
  const [reverting,  setReverting]  = React.useState<number | null>(null);
  const [scanMode,   setScanMode]   = React.useState(false);
  const [pin,        setPin]        = React.useState("");
  const [pinBusy,    setPinBusy]    = React.useState(false);
  const [pinResult,  setPinResult]  = React.useState<{ ok: boolean; msg: string } | null>(null);
  const scannerRef  = React.useRef<HTMLDivElement>(null);
  const scannerInst = React.useRef<unknown>(null);

  const staffHeaders = staffToken && staffPin
    ? { "x-staff-token": staffToken, "x-staff-pin": staffPin }
    : undefined;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)                params.set("q", search);
      if (statusTab !== "all")   params.set("status", statusTab);
      const res  = await fetch(`/api/v1/events/${eventId}/checkin?${params}`, {
        headers: staffHeaders as HeadersInit,
      });
      const json = await res.json();
      if (res.ok) {
        setEvent(json.event);
        setSummary(json.summary);
        setInvitees(json.invitees);
        setPage(1);
      }
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { load(); }, [search, statusTab]);

  async function checkin(inviteeId: number) {
    setChecking(inviteeId);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/checkin`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(staffHeaders ?? {}) } as HeadersInit,
        body:    JSON.stringify({ inviteeId, method: "manual" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error ?? "Error", variant: "destructive" });
        return;
      }
      setInvitees(prev => prev.map(i =>
        i.id === inviteeId
          ? { ...i, checkinStatus: "checked_in", checkinAt: new Date().toISOString() }
          : i
      ));
      setSummary(prev => ({ ...prev, checkedIn: prev.checkedIn + 1, notArrived: prev.notArrived - 1 }));
      const name = invitees.find(i => i.id === inviteeId)?.name ?? "Guest";
      toast({ title: `${name} checked in!` });
    } finally {
      setChecking(null);
    }
  }

  async function revert(inviteeId: number) {
    setReverting(inviteeId);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/checkin`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...(staffHeaders ?? {}) } as HeadersInit,
        body:    JSON.stringify({ inviteeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error ?? "Error", variant: "destructive" });
        return;
      }
      setInvitees(prev => prev.map(i =>
        i.id === inviteeId
          ? { ...i, checkinStatus: "not_arrived", checkinAt: null }
          : i
      ));
      setSummary(prev => ({ ...prev, checkedIn: prev.checkedIn - 1, notArrived: prev.notArrived + 1 }));
      const name = invitees.find(i => i.id === inviteeId)?.name ?? "Guest";
      toast({ title: `${name} reverted to Not Arrived` });
    } finally {
      setReverting(null);
    }
  }

  /* The QR code encodes the full check-in URL (https://.../scan/{token}), not
   * a bare token — so it also works when opened with a regular phone camera.
   * Pull just the token back out for our own API call. */
  function extractQrToken(decoded: string): string {
    const marker = "/scan/";
    const idx = decoded.lastIndexOf(marker);
    const raw = idx === -1 ? decoded : decoded.slice(idx + marker.length);
    return raw.split(/[?#]/)[0].replace(/\/+$/, "");
  }

  /* QR scanner via html5-qrcode */
  async function startScanner() {
    setScanMode(true);
    await new Promise(r => setTimeout(r, 100));
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-scanner");
    scannerInst.current = scanner;
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (text: string) => {
        await scanner.stop();
        setScanMode(false);
        const token = extractQrToken(text);
        const res   = await fetch(`/api/v1/scan/${token}`, { method: "POST" });
        const json = await res.json();
        if (res.ok) {
          toast({ title: `${json.data?.name ?? "Guest"} checked in via QR!` });
          load();
        } else {
          toast({ title: json.error ?? "QR check-in failed", variant: "destructive" });
        }
      },
      () => {/* scan error — ignore */ }
    );
  }

  async function stopScanner() {
    if (scannerInst.current) {
      try { await (scannerInst.current as { stop: () => Promise<void> }).stop(); } catch { /* ignore */ }
    }
    setScanMode(false);
  }

  React.useEffect(() => () => { stopScanner(); }, []);

  async function checkInByPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim().length !== 6) { setPinResult({ ok: false, msg: "Enter a 6-digit PIN" }); return; }
    setPinBusy(true);
    setPinResult(null);
    try {
      const res  = await fetch("/api/v1/scan/pin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin: pin.trim(), eventId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPinResult({ ok: false, msg: json.error ?? "PIN check-in failed" });
        return;
      }
      const name = json.data?.name ?? "Guest";
      setPinResult({ ok: true, msg: `${name} checked in!` });
      setPin("");
      load();
    } catch {
      setPinResult({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setPinBusy(false);
    }
  }

  const totalPages  = Math.max(1, Math.ceil(invitees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = invitees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const checkinPct = summary.total > 0 ? Math.round((summary.checkedIn / summary.total) * 100) : 0;

  const content = (
    <div className="space-y-5">
      {/* Header */}
      {event && (
        <div className="bg-white rounded-2xl border border-warm-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-0.5">Check-in</p>
              <h1 className="text-xl font-extrabold text-gray-900">{event.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{event.venueName} · {formatDate(event.eventDate)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5 shrink-0">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Attendance progress</span>
              <span className="font-semibold text-gray-700">{checkinPct}%</span>
            </div>
            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${checkinPct}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Total",       value: summary.total,      color: "text-gray-900", icon: Users },
              { label: "Checked In",  value: summary.checkedIn,  color: "text-green-600", icon: CheckCircle2 },
              { label: "Not Arrived", value: summary.notArrived, color: "text-amber-600", icon: XCircle },
            ].map(s => (
              <div key={s.label} className="bg-warm-50 rounded-xl p-3 text-center">
                <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scanner — admin/staff only */}
      {!readOnly && (
        scanMode ? (
          <div className="bg-white rounded-2xl border border-warm-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <ScanLine size={16} className="text-amber-600" /> Scanning QR Code…
              </p>
              <Button size="sm" variant="outline" onClick={stopScanner}>Cancel</Button>
            </div>
            <div id="qr-scanner" ref={scannerRef} className="w-full rounded-xl overflow-hidden" />
          </div>
        ) : (
          <Button
            onClick={startScanner}
            className="w-full h-11 gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <QrCode size={18} /> Scan QR Code
          </Button>
        )
      )}

      {/* PIN check-in — staff only */}
      {!readOnly && (
        <div className="bg-white rounded-2xl border border-warm-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <KeyRound size={15} className="text-amber-600" /> Check In by PIN
          </p>
          <form onSubmit={checkInByPin} className="flex gap-2">
            <Input
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinResult(null); }}
              placeholder="6-digit PIN"
              inputMode="numeric"
              maxLength={6}
              className="font-mono tracking-widest text-center text-lg w-40 shrink-0"
            />
            <Button
              type="submit"
              disabled={pinBusy || pin.trim().length !== 6}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
            >
              {pinBusy ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
              Check In
            </Button>
          </form>
          {pinResult && (
            <p className={`text-sm font-medium flex items-center gap-1.5 ${pinResult.ok ? "text-green-600" : "text-red-500"}`}>
              {pinResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {pinResult.msg}
            </p>
          )}
          <p className="text-xs text-gray-400">For guests who cannot scan a QR code</p>
        </div>
      )}

      {/* Invitee list */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-warm-100 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guests…"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "not_arrived", "checked_in"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusTab(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusTab === s
                    ? "bg-amber-600 text-white"
                    : "bg-warm-50 text-gray-500 hover:bg-warm-100"
                }`}
              >
                {s === "all" ? "All" : s === "checked_in" ? "Checked In" : "Not Arrived"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : invitees.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No guests found</div>
        ) : (
          <>
            <div className="divide-y divide-warm-50">
              {paged.map(inv => {
                const isCheckedIn = inv.checkinStatus === "checked_in";
                return (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isCheckedIn ? "bg-green-100 text-green-700" : "bg-warm-100 text-gray-600"
                      }`}>
                        {inv.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{inv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{CATEGORY_LABELS[inv.category] ?? inv.category}</span>
                          {inv.phone && <span className="text-xs text-gray-400">{inv.phone}</span>}
                          {isCheckedIn && inv.checkinAt && (
                            <span className="text-xs text-green-600">{formatDate(inv.checkinAt, true)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {isCheckedIn ? (
                        <>
                          <Badge variant="success" className="text-xs gap-1">
                            <CheckCircle2 size={11} /> In
                          </Badge>
                          {!readOnly && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                              disabled={reverting === inv.id}
                              onClick={() => revert(inv.id)}
                              title="Revert to Not Arrived"
                            >
                              {reverting === inv.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Undo2 size={12} />
                              }
                            </Button>
                          )}
                        </>
                      ) : (
                        !readOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            disabled={checking === inv.id}
                            onClick={() => checkin(inv.id)}
                          >
                            {checking === inv.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <UserCheck size={12} />
                            }
                            Check In
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-warm-50/30 p-4 sm:p-6 max-w-4xl mx-auto">
      {content}
    </div>
  );
}
