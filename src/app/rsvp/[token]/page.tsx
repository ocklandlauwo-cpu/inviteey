"use client";

import * as React from "react";
import { Calendar, MapPin, CheckCircle2, XCircle, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo }   from "@/components/ui/logo";

interface InviteeInfo {
  id:         number;
  name:       string;
  rsvpStatus: "pending" | "confirmed" | "declined";
  event: {
    id:        number;
    name:      string;
    eventDate: string;
    venueName: string;
    type:      string;
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:       "Wedding",
  birthday:      "Birthday",
  sendoff:       "Sendoff",
  kitchen_party: "Kitchen Party",
  corporate:     "Corporate",
  fundraising:   "Fundraising",
  other:         "Event",
};

export default function PublicRsvpPage({ params }: { params: { token: string } }) {
  const [info,      setInfo]      = React.useState<InviteeInfo | null>(null);
  const [loading,   setLoading]   = React.useState(true);
  const [notFound,  setNotFound]  = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"confirmed" | "declined" | null>(null);
  const [submitted,  setSubmitted]  = React.useState<"confirmed" | "declined" | null>(null);
  const [error,      setError]      = React.useState("");

  React.useEffect(() => {
    fetch(`/api/v1/rsvp/${params.token}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setInfo(json.data);
          if (json.data.rsvpStatus !== "pending") {
            setSubmitted(json.data.rsvpStatus as "confirmed" | "declined");
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(response: "confirmed" | "declined") {
    setSubmitting(response);
    setError("");
    try {
      const res  = await fetch(`/api/v1/rsvp/${params.token}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ response }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong."); return; }
      setSubmitted(response);
      setInfo(prev => prev ? { ...prev, rsvpStatus: response } : prev);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl border border-warm-200 p-10 text-center">
          <XCircle size={44} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-sm text-gray-500">This RSVP link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(info.event.eventDate);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-warm-200 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-600 px-6 py-6 text-white text-center">
          <p className="text-xs font-medium uppercase tracking-widest opacity-75 mb-1">
            {EVENT_TYPE_LABELS[info.event.type] ?? "Event"} Invitation
          </p>
          <h1 className="text-xl font-extrabold leading-tight">{info.event.name}</h1>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm opacity-90">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {eventDate.toLocaleDateString("en-TZ", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <span className="flex items-center justify-center gap-1.5 text-sm opacity-90 mt-1">
            <MapPin size={14} />
            {info.event.venueName}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0">
              {info.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Dear</p>
              <p className="text-lg font-extrabold text-gray-900 leading-tight">{info.name}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            You are warmly invited to join us. Please let us know if you&apos;ll be attending.
          </p>

          {submitted ? (
            <div className={`rounded-2xl p-5 text-center ${submitted === "confirmed" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              {submitted === "confirmed" ? (
                <>
                  <PartyPopper size={36} className="mx-auto text-green-500 mb-2" />
                  <p className="font-extrabold text-green-800 text-lg">You&apos;re Attending!</p>
                  <p className="text-sm text-green-600 mt-1">Thank you. We look forward to seeing you.</p>
                </>
              ) : (
                <>
                  <XCircle size={36} className="mx-auto text-red-400 mb-2" />
                  <p className="font-extrabold text-red-700 text-lg">Response Recorded</p>
                  <p className="text-sm text-red-500 mt-1">We&apos;re sorry you can&apos;t make it. Thank you for letting us know.</p>
                </>
              )}

              <button
                onClick={() => setSubmitted(null)}
                className="mt-4 text-xs text-gray-400 underline hover:text-gray-600"
              >
                Change my response
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
              )}
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base rounded-xl gap-2"
                disabled={!!submitting}
                onClick={() => respond("confirmed")}
              >
                {submitting === "confirmed"
                  ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                  : <><CheckCircle2 size={18} /> Yes, I will attend</>}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50"
                disabled={!!submitting}
                onClick={() => respond("declined")}
              >
                {submitting === "declined"
                  ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                  : <><XCircle size={18} /> No, I can&apos;t attend</>}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1">
        <Logo size="xs" />
        <p className="text-xs text-gray-400">invitee.co.tz</p>
      </div>
    </div>
  );
}
