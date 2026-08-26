"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Clock, User, Calendar, MapPin, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Logo }   from "@/components/ui/logo";

interface InviteeData {
  id:            number;
  name:          string;
  phone:         string | null;
  category:      string;
  seatType:      string;
  checkinCount:  number;
  rsvpStatus:    string;
  checkinStatus: string;
  qrToken:       string;
}

interface EventData {
  id:        number;
  name:      string;
  eventDate: string;
  venueName: string;
  status:    string;
}

interface Props {
  invitee: InviteeData;
  event:   EventData;
}

const CATEGORY_LABELS: Record<string, string> = {
  family: "Family", friends: "Friends", colleagues: "Colleagues",
  vip: "VIP", other: "Guest",
};

export function ScanClient({ invitee, event }: Props) {
  const isDouble = invitee.seatType === "double";
  const maxSeats = isDouble ? 2 : 1;

  const [status,       setStatus]       = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg,     setErrorMsg]     = React.useState("");
  const [checkinCount, setCheckinCount] = React.useState(invitee.checkinCount);

  const seatsLeft = maxSeats - checkinCount;
  const fullyClosed = seatsLeft <= 0;

  async function handleCheckIn() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res  = await fetch(`/api/v1/scan/${invitee.qrToken}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Check-in failed");
        return;
      }
      setCheckinCount(json.data?.checkinCount ?? checkinCount + 1);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  const eventDate  = new Date(event.eventDate);
  const isEventDay = event.status === "event_day" || event.status === "active";

  /* Seat indicator for double tickets */
  function SeatBadge() {
    if (!isDouble) return null;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {[1, 2].map(seat => (
          <div
            key={seat}
            className={`h-2 rounded-full flex-1 transition-all ${
              checkinCount >= seat ? "bg-green-500" : "bg-warm-200"
            }`}
          />
        ))}
        <span className="text-[10px] text-gray-400 ml-0.5 font-medium">
          {checkinCount}/{maxSeats} seats
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-warm-200 overflow-hidden">
        {/* Event header */}
        <div className="bg-amber-600 px-6 py-5 text-white text-center">
          <p className="text-xs font-medium uppercase tracking-widest opacity-80 mb-1">Event Check-in</p>
          <h1 className="text-lg font-extrabold leading-tight">{event.name}</h1>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm opacity-90">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {eventDate.toLocaleDateString("en-TZ", { day: "numeric", month: "short" })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {event.venueName}
            </span>
          </div>
        </div>

        {/* Invitee details */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
              {invitee.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-lg leading-tight truncate">{invitee.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">
                  {CATEGORY_LABELS[invitee.category] ?? invitee.category}
                </Badge>
                {isDouble && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users size={10} /> Double Seat
                  </Badge>
                )}
                {invitee.rsvpStatus === "confirmed" && (
                  <span className="text-xs text-green-600 font-medium">RSVP ✓</span>
                )}
              </div>
              <SeatBadge />
            </div>
          </div>

          {/* Check-in area */}
          {fullyClosed || (status === "success" && seatsLeft <= 0) ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <CheckCircle2 size={36} className="mx-auto text-green-500 mb-2" />
              <p className="font-bold text-green-800 text-lg">
                {isDouble ? "Both Seats Checked In!" : "Checked In!"}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Welcome{isDouble ? ", both guests are" : ""} to the event!
              </p>
            </div>
          ) : status === "success" && isDouble ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                <p className="font-bold text-green-800">Seat {checkinCount} of {maxSeats} — Welcome!</p>
                <p className="text-sm text-green-600 mt-1">
                  The second person may scan again when they arrive.
                </p>
              </div>
              <Button
                onClick={handleCheckIn}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 text-base rounded-xl gap-2"
              >
                <User size={16} /> Check In Second Guest
              </Button>
            </div>
          ) : status === "error" ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <XCircle size={36} className="mx-auto text-red-400 mb-2" />
                <p className="font-bold text-red-700">Check-in Failed</p>
                <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
              </div>
              <Button onClick={() => setStatus("idle")} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {!isEventDay && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
                  <Clock size={14} className="shrink-0" />
                  Event not yet open for check-in.
                </div>
              )}
              {isDouble && checkinCount === 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
                  <Users size={14} className="shrink-0" />
                  First guest already checked in. Check in the second guest below.
                </div>
              )}
              <Button
                onClick={handleCheckIn}
                disabled={status === "loading"}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 text-base rounded-xl gap-2"
              >
                {status === "loading" ? (
                  <><Loader2 size={18} className="animate-spin" /> Checking in…</>
                ) : isDouble ? (
                  <><User size={18} /> Check In {checkinCount === 0 ? "Guest 1" : "Guest 2"}</>
                ) : (
                  <><User size={18} /> Check In</>
                )}
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
