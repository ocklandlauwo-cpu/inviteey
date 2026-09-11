"use client";

import * as React from "react";
import {
  ImageIcon, RefreshCw, Sparkles, Loader2, CheckCircle2, XCircle,
  Clock, Download, Eye, MessageCircle, X, Users, User,
  ExternalLink, KeyRound,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import type { EcardTemplate } from "@prisma/client";

export type EcardRow = {
  id:        number;
  status:    string;
  imagePath: string | null;
  sentAt:    Date | null;
};

export type InviteeRow = {
  id:       number;
  name:     string;
  phone:    string | null;
  email:    string | null;
  seatType: string;
  pin:      string | null;
  ecards:   EcardRow[];
};

interface Props {
  eventId:           number;
  templates:         EcardTemplate[];
  initialInvitees:   InviteeRow[];
  initialTemplateId: number | null;
  isAdmin?:          boolean;
}

type WhatsAppVendor = "wasender" | "authkey";
const VENDOR_LABELS: Record<WhatsAppVendor, string> = {
  wasender: "WaSender",
  authkey:  "AuthKey.io",
};

const STATUS_BADGE: Record<string, "secondary" | "info" | "success" | "error"> = {
  pending:    "secondary",
  processing: "info",
  completed:  "success",
  failed:     "error",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending:    Clock,
  processing: Loader2,
  completed:  CheckCircle2,
  failed:     XCircle,
};

export function EcardsClient({ eventId, templates, initialInvitees, initialTemplateId, isAdmin }: Props) {
  const { toast } = useToast();
  const [invitees, setInvitees]             = React.useState(initialInvitees);
  const [selectedTemplate, setTemplate]     = React.useState<number | null>(initialTemplateId);
  const [vendor,       setVendor]           = React.useState<WhatsAppVendor>("wasender");
  const [generating,   setGenerating]       = React.useState(false);
  const [refreshing,   setRefreshing]       = React.useState(false);
  const [rowBusy,      setRowBusy]          = React.useState<number | null>(null);
  const [sending,      setSending]          = React.useState<number | null>(null);
  const [previewEcard, setPreviewEcard]     = React.useState<{ name: string; path: string } | null>(null);
  const [deepLink,     setDeepLink]         = React.useState<{ name: string; url: string } | null>(null);
  const [page,         setPage]             = React.useState(1);

  const totalPages  = Math.max(1, Math.ceil(invitees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = invitees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function refresh() {
    setRefreshing(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/ecards`);
      const json = await res.json();
      if (res.ok) setInvitees(json.data);
    } catch { /* silent */ } finally {
      setRefreshing(false);
    }
  }

  async function generate(inviteeIds?: number[]) {
    if (!selectedTemplate) {
      toast({ title: "Select a template first", variant: "destructive" });
      return;
    }
    if (inviteeIds) setRowBusy(inviteeIds[0]); else setGenerating(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/ecards`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ templateId: selectedTemplate, inviteeIds }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Generation failed", description: json.error, variant: "destructive" }); return; }
      toast({ title: `Queued ${json.data.queued} e-card${json.data.queued !== 1 ? "s" : ""} for generation` });
      await refresh();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setGenerating(false);
      setRowBusy(null);
    }
  }

  async function sendWhatsApp(inv: InviteeRow) {
    if (!inv.phone) {
      toast({ title: "No phone number for this guest", variant: "destructive" });
      return;
    }
    setSending(inv.id);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/ecards/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ inviteeId: inv.id, vendor }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error ?? "Send failed", variant: "destructive" }); return; }

      if (json.auto) {
        toast({ title: `E-card sent to ${inv.name} via WhatsApp (${VENDOR_LABELS[json.vendor as WhatsAppVendor] ?? json.vendor})` });
        await refresh();
      } else if (json.deepLink) {
        setDeepLink({ name: inv.name, url: json.deepLink });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSending(null);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
        <ImageIcon size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No e-card templates available yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Templates for this event type haven&apos;t been added by the Invitee team yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Template picker */}
      <div className="bg-white rounded-2xl border border-warm-200 p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">Choose a Template</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {templates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => setTemplate(tpl.id)}
              className={`rounded-xl border-2 overflow-hidden text-left transition-colors ${
                selectedTemplate === tpl.id ? "border-amber-500 ring-2 ring-amber-200" : "border-warm-200 hover:border-amber-300"
              }`}
            >
              <div className="relative aspect-[4/5] bg-warm-50">
                {tpl.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/uploads/templates/${tpl.thumbnailPath}`}
                    alt={tpl.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-gray-700 truncate">{tpl.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">{invitees.length} guest{invitees.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="wa-vendor" className="text-xs text-gray-500 font-medium">WhatsApp via</label>
              <select
                id="wa-vendor"
                value={vendor}
                onChange={e => setVendor(e.target.value as WhatsAppVendor)}
                className="text-xs font-medium border border-warm-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
              >
                {(Object.keys(VENDOR_LABELS) as WhatsAppVendor[]).map(v => (
                  <option key={v} value={v}>{VENDOR_LABELS[v]}</option>
                ))}
              </select>
            </div>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            onClick={() => generate()}
            disabled={generating || !selectedTemplate}
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Generate All
          </Button>
        </div>
      </div>

      {/* Guest list */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {invitees.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No guests added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Seat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">PIN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-card</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(inv => {
                  const ecard  = inv.ecards[0];
                  const status = ecard?.status ?? null;
                  const Icon   = status ? STATUS_ICON[status] : null;
                  const sent   = !!ecard?.sentAt;
                  const ready  = status === "completed" && !!ecard?.imagePath;
                  return (
                    <tr key={inv.id} className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{inv.name}</div>
                        {inv.phone && <div className="text-xs text-gray-400">{inv.phone}</div>}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs gap-1 capitalize">
                          {inv.seatType === "double"
                            ? <><Users size={10} /> Double</>
                            : <><User  size={10} /> Single</>}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 hidden sm:table-cell">
                        {inv.pin ? (
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg tracking-widest">
                            <KeyRound size={10} className="inline mr-1" />{inv.pin}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {status ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant={STATUS_BADGE[status]} className="text-xs capitalize gap-1 inline-flex items-center">
                              {Icon && <Icon size={11} className={status === "processing" ? "animate-spin" : ""} />}
                              {status}
                            </Badge>
                            {sent && (
                              <span className="text-[10px] text-green-600 font-medium">Sent</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">Not generated</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {ready && (
                            <>
                              <button
                                title="Preview e-card"
                                onClick={() => setPreviewEcard({ name: inv.name, path: ecard!.imagePath! })}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                              <a
                                href={`/uploads/${ecard!.imagePath}`}
                                download
                                title="Download e-card"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <Download size={14} />
                              </a>
                              <button
                                title="Send via WhatsApp"
                                onClick={() => sendWhatsApp(inv)}
                                disabled={sending === inv.id}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                              >
                                {sending === inv.id
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <MessageCircle size={14} />}
                              </button>
                            </>
                          )}
                          <button
                            title={ecard ? "Regenerate" : "Generate"}
                            onClick={() => generate([inv.id])}
                            disabled={rowBusy === inv.id || !selectedTemplate}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                          >
                            {rowBusy === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>

      {/* E-card preview modal */}
      {previewEcard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewEcard(null)}>
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-100">
              <div>
                <p className="font-bold text-gray-900 text-sm">{previewEcard.name}</p>
                <p className="text-xs text-gray-400">E-card preview</p>
              </div>
              <button onClick={() => setPreviewEcard(null)} className="p-1.5 rounded-lg hover:bg-warm-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/uploads/${previewEcard.path}`}
              alt="E-card preview"
              className="w-full object-contain max-h-[70vh]"
            />
            <div className="px-5 py-4 flex justify-end gap-2 border-t border-warm-100">
              <a
                href={`/uploads/${previewEcard.path}`}
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-warm-200 text-gray-700 hover:bg-warm-50"
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={() => setPreviewEcard(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp deep-link modal (manual send fallback) */}
      {deepLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeepLink(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">Send to {deepLink.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">WhatsApp auto-send is not configured. Open WhatsApp to send manually.</p>
              </div>
              <button onClick={() => setDeepLink(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <a
              href={deepLink.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDeepLink(null)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors"
            >
              <MessageCircle size={18} /> Open WhatsApp <ExternalLink size={14} />
            </a>
            <p className="text-xs text-gray-400 text-center">
              To enable auto-send, configure <code className="font-mono bg-warm-100 px-1 rounded">WASENDER_API_KEY</code> in your environment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
