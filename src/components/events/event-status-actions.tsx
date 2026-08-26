"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Rocket, CalendarClock, CheckCircle2, XCircle, Loader2, AlertTriangle,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { useToast }  from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EventStatus = "draft" | "active" | "event_day" | "completed" | "cancelled";

interface Props {
  eventId: number;
  status:  EventStatus;
}

interface Step {
  from:        EventStatus;
  to:          EventStatus;
  label:       string;
  description: string;
  icon:        React.ElementType;
  style:       string;
  confirm?:    string;
}

const STEPS: Step[] = [
  {
    from:        "draft",
    to:          "active",
    label:       "Publish Event",
    description: "Make the event active so guests receive notifications and RSVPs.",
    icon:        Rocket,
    style:       "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    from:        "active",
    to:          "event_day",
    label:       "Start Event Day",
    description: "Opens the check-in system. Staff can now scan guest QR codes and PINs.",
    icon:        CalendarClock,
    style:       "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    from:        "event_day",
    to:          "completed",
    label:       "End Event",
    description: "Mark the event as completed. Check-in will be closed.",
    icon:        CheckCircle2,
    style:       "bg-blue-600 hover:bg-blue-700 text-white",
    confirm:     "This will close check-in and mark the event as completed. This action cannot be undone.",
  },
  {
    from:        "active",
    to:          "cancelled",
    label:       "Cancel Event",
    description: "Cancel this event permanently.",
    icon:        XCircle,
    style:       "bg-red-600 hover:bg-red-700 text-white",
    confirm:     "This will cancel the event. This action cannot be undone.",
  },
  {
    from:        "draft",
    to:          "cancelled",
    label:       "Cancel Event",
    description: "Cancel this draft event.",
    icon:        XCircle,
    style:       "bg-red-600 hover:bg-red-700 text-white",
    confirm:     "This will cancel the event. This action cannot be undone.",
  },
];

export function EventStatusActions({ eventId, status }: Props) {
  const router    = useRouter();
  const { toast } = useToast();
  const [loading,  setLoading]  = React.useState(false);
  const [confirm,  setConfirm]  = React.useState<Step | null>(null);

  if (status === "completed" || status === "cancelled") return null;

  const actions = STEPS.filter(s => s.from === status);
  if (actions.length === 0) return null;

  const primary    = actions.find(a => a.to !== "cancelled")!;
  const secondary  = actions.find(a => a.to === "cancelled");

  async function apply(step: Step) {
    if (step.confirm) { setConfirm(step); return; }
    await execute(step);
  }

  async function execute(step: Step) {
    setLoading(true);
    setConfirm(null);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: step.to }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error ?? "Failed", variant: "destructive" }); return; }
      toast({ title: `Event ${step.label.toLowerCase()}` });
      router.refresh();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const Icon = primary.icon;

  return (
    <>
      <div className={`rounded-2xl border p-5 ${
        primary.to === "event_day" ? "bg-green-50 border-green-200" :
        primary.to === "completed" ? "bg-blue-50 border-blue-200" :
        "bg-amber-50 border-amber-200"
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              primary.to === "event_day" ? "bg-green-100 text-green-700" :
              primary.to === "completed" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{primary.label}</p>
              <p className="text-sm text-gray-600 mt-0.5">{primary.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {secondary && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                disabled={loading}
                onClick={() => apply(secondary)}
              >
                <XCircle size={14} /> Cancel Event
              </Button>
            )}
            <Button
              size="sm"
              className={`gap-2 ${primary.style}`}
              disabled={loading}
              onClick={() => apply(primary)}
            >
              {loading
                ? <Loader2 size={14} className="animate-spin" />
                : <Icon size={14} />}
              {primary.label}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && execute(confirm)}
        title={confirm?.label ?? ""}
        description={
          <span className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            {confirm?.confirm ?? ""}
          </span>
        }
        confirmText={confirm?.label ?? "Confirm"}
        loading={loading}
      />
    </>
  );
}
