"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { CheckinDashboard } from "@/components/checkin/checkin-dashboard";

export default function StaffCheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [pin,       setPin]       = React.useState("");
  const [error,     setError]     = React.useState("");
  const [loading,   setLoading]   = React.useState(false);
  const [eventId,   setEventId]   = React.useState<number | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) { setError("PIN must be 6 digits"); return; }
    setLoading(true);
    setError("");
    try {
      /* Validate token+PIN by calling checkin GET with staff headers */
      const res  = await fetch("/api/v1/staff/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, pin }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Invalid PIN"); return; }
      setEventId(json.eventId);
    } finally {
      setLoading(false);
    }
  }

  if (eventId) {
    return <CheckinDashboard eventId={eventId} staffToken={token} staffPin={pin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-warm-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
          <KeyRound size={28} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff Check-in Access</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the 6-digit PIN provided by the organizer</p>
        </div>
        <form onSubmit={handleUnlock} className="space-y-3 text-left">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.4em] font-mono h-14"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <Button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            Unlock
          </Button>
        </form>
        <p className="text-xs text-gray-400">Powered by <span className="font-semibold text-amber-600">Invitee</span></p>
      </div>
    </div>
  );
}
