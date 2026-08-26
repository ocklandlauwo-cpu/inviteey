"use client";

import * as React        from "react";
import { Sparkles, Loader2, RefreshCw, PartyPopper } from "lucide-react";
import { Button }        from "@/components/ui/button";
import { useToast }      from "@/components/ui/use-toast";

interface Props {
  eventId: number;
}

export function PostEventSummary({ eventId }: Props) {
  const { toast }                   = useToast();
  const [loading,   setLoading]     = React.useState(false);
  const [summary,   setSummary]     = React.useState<string | null>(null);
  const [generated, setGenerated]   = React.useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/summary`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to generate summary", variant: "destructive" });
        return;
      }
      setSummary(json.summary);
      setGenerated(true);
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <PartyPopper size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Post-Event Summary</h2>
            <p className="text-sm text-gray-500">AI-generated overview of your event's performance</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={generate}
          disabled={loading}
          className={`gap-2 shrink-0 ${
            generated
              ? "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}
          variant={generated ? "outline" : "default"}
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : generated
              ? <RefreshCw size={14} />
              : <Sparkles size={14} />
          }
          {loading ? "Generating…" : generated ? "Regenerate" : "Generate with AI"}
        </Button>
      </div>

      {summary ? (
        <div className="bg-white/70 rounded-xl border border-amber-100 p-4">
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </div>
      ) : (
        <div className="bg-white/50 rounded-xl border border-dashed border-amber-200 p-6 text-center">
          <Sparkles size={24} className="mx-auto text-amber-300 mb-2" />
          <p className="text-sm text-gray-400">
            Click "Generate with AI" to get a personalized summary of your event
          </p>
        </div>
      )}
    </div>
  );
}
