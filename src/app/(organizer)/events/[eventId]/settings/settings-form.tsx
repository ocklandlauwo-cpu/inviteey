"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm }   from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, ArrowUpCircle } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { EVENT_TYPE_LABELS, TIER_LABELS, TIER_PRICES, CURRENCIES } from "@/types";
import type { Event, EventTier } from "@prisma/client";

const schema = z.object({
  name:         z.string().min(3, "Min 3 chars").max(200),
  type:         z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]),
  eventDate:    z.string().min(1, "Required"),
  venueName:    z.string().min(2, "Min 2 chars").max(300),
  venueAddress: z.string().optional(),
  description:  z.string().optional(),
  language:     z.enum(["en","sw"]),
  currencyCode: z.string().min(3).max(3),
  status:       z.enum(["draft","active","event_day","completed","cancelled"]),
});

type FormData = z.infer<typeof schema>;

const NEXT_TIER: Partial<Record<EventTier, EventTier>> = {
  basic: "standard", standard: "premium", premium: "royal",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", active: "Active", event_day: "Event Day",
  completed: "Completed", cancelled: "Cancelled",
};

interface Props { event: Event }

export function EventSettingsForm({ event }: Props) {
  const router    = useRouter();
  const { toast } = useToast();
  const [requesting, setRequesting] = React.useState(false);

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: {
      name:         event.name,
      type:         event.type,
      eventDate:    new Date(event.eventDate).toISOString().slice(0, 16),
      venueName:    event.venueName,
      venueAddress: event.venueAddress ?? "",
      description:  event.description ?? "",
      language:     event.language,
      currencyCode: event.currencyCode,
      status:       event.status,
    },
  });

  const type         = watch("type");
  const language     = watch("language");
  const currencyCode = watch("currencyCode");
  const status       = watch("status");

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch(`/api/v1/events/${event.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Event updated successfully" });
      router.refresh();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  async function requestTierUpgrade(newTier: EventTier) {
    setRequesting(true);
    try {
      const res  = await fetch(`/api/v1/events/${event.id}/tier`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tier: newTier }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({
        title:       "Upgrade requested!",
        description: `${TIER_LABELS[newTier]} plan request submitted. We will activate it after payment confirmation.`,
      });
      router.refresh();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  }

  const nextTier = NEXT_TIER[event.tier];
  const pendingUpgrade = !event.tierActivatedAt && event.tier !== "basic";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Event details */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <h2 className="font-bold text-gray-900 mb-6">Event Details</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input id="name" placeholder="e.g. Amina & John Wedding" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={type} onValueChange={v => setValue("type", v as FormData["type"], { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={v => setValue("language", v as "en" | "sw", { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currencyCode} onValueChange={v => setValue("currencyCode", v, { shouldDirty: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Date &amp; Time *</Label>
            <Input id="eventDate" type="datetime-local" {...register("eventDate")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input id="venueName" placeholder="e.g. Serena Hotel Dar es Salaam" {...register("venueName")} />
            {errors.venueName && <p className="text-xs text-red-500">{errors.venueName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address</Label>
            <Input id="venueAddress" placeholder="e.g. Ohio Street, Dar es Salaam" {...register("venueAddress")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Brief description of your event…"
              {...register("description")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setValue("status", v as FormData["status"], { shouldDirty: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Plan & upgrade */}
      <div id="tier" className="bg-white rounded-2xl border border-warm-200 p-6">
        <h2 className="font-bold text-gray-900 mb-3">Current Plan</h2>
        <div className="flex items-center gap-3 mb-5">
          <Badge variant={event.tier as "basic" | "standard" | "premium" | "royal"} className="text-sm px-3 py-1">
            {TIER_LABELS[event.tier]}
          </Badge>
          {event.tierActivatedAt && (
            <span className="text-xs text-green-600 font-medium">Active</span>
          )}
          {pendingUpgrade && (
            <span className="text-xs text-amber-600 font-medium">Awaiting payment confirmation</span>
          )}
        </div>

        {nextTier && (
          <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">Upgrade to {TIER_LABELS[nextTier]}</p>
                <p className="text-sm text-gray-500 mt-1">More guests, more features, more tools for your event.</p>
                <p className="text-lg font-bold text-amber-700 mt-2">
                  {TIER_PRICES[nextTier].toLocaleString("en")} TZS
                  <span className="text-sm font-normal text-gray-500 ml-1">/ event</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Pay via M-Pesa or bank transfer. Activated within 24 hours.</p>
              </div>
              <Button
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-2 mt-1"
                disabled={requesting || pendingUpgrade}
                onClick={() => requestTierUpgrade(nextTier)}
              >
                {requesting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                Request Upgrade
              </Button>
            </div>
          </div>
        )}

        {!nextTier && (
          <p className="text-sm text-gray-500">You&apos;re on the highest plan. No further upgrades available.</p>
        )}
      </div>
    </div>
  );
}
