"use client";

import * as React from "react";
import {
  Link2, Trash2, Loader2, Plus, Copy, CheckCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { useToast }  from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface StaffToken {
  id:          number;
  accessToken: string;
  pin:         string;
  expiresAt:   string;
}

interface Props {
  eventId: number;
}

export function StaffLinksPanel({ eventId }: Props) {
  const { toast } = useToast();

  const [tokens,    setTokens]    = React.useState<StaffToken[]>([]);
  const [loading,   setLoading]   = React.useState(true);
  const [open,      setOpen]      = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [revoking,  setRevoking]  = React.useState<number | null>(null);
  const [copied,    setCopied]    = React.useState<number | null>(null);

  React.useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/staff`);
      const json = await res.json();
      if (res.ok) setTokens(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/staff`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ hours: 24 }),
      });
      const json = await res.json();
      if (res.ok) {
        setTokens(prev => [json.data, ...prev]);
        setOpen(true);
        toast({ title: "Staff link generated" });
      } else {
        toast({ title: json.error ?? "Failed to generate link", variant: "destructive" });
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: number) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/staff`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });
      if (res.ok) {
        setTokens(prev => prev.filter(t => t.id !== id));
        toast({ title: "Link revoked" });
      }
    } finally {
      setRevoking(null);
    }
  }

  function copyLink(token: StaffToken) {
    const url = `${window.location.origin}/checkin/${token.accessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-warm-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-amber-600" />
          <span className="font-semibold text-sm text-gray-800">Staff Access Links</span>
          {tokens.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
              {tokens.length} active
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-warm-100">
          <p className="text-xs text-gray-500 pt-3">
            Generate a 24-hour link + PIN for check-in staff. They visit the link and enter the PIN — no account needed.
          </p>

          <Button size="sm" onClick={generate} disabled={generating} className="gap-2">
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Generate Link
          </Button>

          {loading ? (
            <div className="text-xs text-gray-400 py-2">Loading…</div>
          ) : tokens.length === 0 ? (
            <p className="text-xs text-gray-400">No active staff links.</p>
          ) : (
            <div className="divide-y divide-warm-50 rounded-xl border border-warm-100 overflow-hidden">
              {tokens.map(t => (
                <div key={t.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-mono font-bold text-gray-800 tracking-widest">PIN: {t.pin}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Expires {formatDate(t.expiresAt, true)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => copyLink(t)}
                    >
                      {copied === t.id
                        ? <><CheckCheck size={12} className="text-green-600" /> Copied</>
                        : <><Copy size={12} /> Copy Link</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                      disabled={revoking === t.id}
                      onClick={() => revoke(t.id)}
                      title="Revoke link"
                    >
                      {revoking === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
