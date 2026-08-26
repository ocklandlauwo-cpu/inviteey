"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { EVENT_TYPE_LABELS, CURRENCIES } from "@/types";

const schema = z.object({
  name:        z.string().min(3, "Event name must be at least 3 characters").max(200),
  type:        z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]),
  eventDate:   z.string().min(1, "Event date is required"),
  venueName:   z.string().min(2, "Venue name is required").max(300),
  venueAddress:z.string().optional(),
  description: z.string().optional(),
  language:     z.enum(["en","sw"]).default("en"),
  currencyCode: z.string().min(3).max(3).default("TZS"),
});

type FormData = z.infer<typeof schema>;

export default function NewEventPage() {
  const router    = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "wedding", language: "en", currencyCode: "TZS" },
  });

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch("/api/v1/events", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Event created!", description: "Your event has been created." });
      router.push(`/events/${json.data.id}`);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  const type         = watch("type");
  const language     = watch("language");
  const currencyCode = watch("currencyCode");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Back to Events
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">Create New Event</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details to get started</p>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input id="name" placeholder="e.g. John & Jane's Wedding" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select value={type} onValueChange={v => setValue("type", v as FormData["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language *</Label>
              <Select value={language} onValueChange={v => setValue("language", v as "en" | "sw")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Currency *</Label>
            <Select value={currencyCode} onValueChange={v => setValue("currencyCode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date & Time *</Label>
            <Input id="eventDate" type="datetime-local" {...register("eventDate")} />
            {errors.eventDate && <p className="text-xs text-red-500">{errors.eventDate.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input id="venueName" placeholder="e.g. Serena Hotel Dar es Salaam" {...register("venueName")} />
            {errors.venueName && <p className="text-xs text-red-500">{errors.venueName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="venueAddress" placeholder="Street address or Google Maps link" {...register("venueAddress")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <textarea
              id="description"
              rows={3}
              placeholder="A brief description of your event…"
              {...register("description")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/events" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Creating…</>
              ) : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
