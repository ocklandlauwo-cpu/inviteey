"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 }  from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:       "Wedding",
  birthday:      "Birthday",
  sendoff:       "Sendoff",
  kitchen_party: "Kitchen Party",
  corporate:     "Corporate",
  fundraising:   "Fundraising",
  other:         "Other",
};

export const CHANNEL_LABELS: Record<string, string> = {
  sms:       "SMS",
  whatsapp:  "WhatsApp",
  email:     "Email",
};

export const NOTIF_TYPE_LABELS: Record<string, string> = {
  invitation:             "Invitation",
  reminder:               "Reminder",
  rsvp_followup:          "RSVP Follow-up",
  contribution_reminder:  "Contribution Reminder",
  ecard:                  "E-Card",
  cancellation:           "Cancellation",
  contribution_ack:       "Contribution Acknowledgement",
};

const schema = z.object({
  name:      z.string().min(1, "Name is required").max(200),
  eventType: z.string().nullable().optional(),
  channel:   z.enum(["sms","whatsapp","email"], { required_error: "Channel is required" }),
  type:      z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","ecard","cancellation","contribution_ack"], { required_error: "Type is required" }),
  language:  z.enum(["en","sw"]).default("en"),
  subject:   z.string().max(300).optional(),
  message:   z.string().min(1, "Message is required"),
  isActive:  z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export interface NotifTemplate {
  id:        number;
  name:      string;
  eventType: string | null;
  channel:   string;
  type:      string;
  language:  string;
  subject:   string | null;
  message:   string;
  isActive:  boolean;
}

interface Props {
  template?: NotifTemplate;
  onClose:   () => void;
  onSaved:   (t: NotifTemplate) => void;
}

export function TemplateDialog({ template, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const isEdit = !!template;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: template ? {
      name:      template.name,
      eventType: template.eventType ?? undefined,
      channel:   template.channel   as FormData["channel"],
      type:      template.type      as FormData["type"],
      language:  template.language  as FormData["language"],
      subject:   template.subject   ?? undefined,
      message:   template.message,
      isActive:  template.isActive,
    } : {
      language: "en",
      isActive: true,
    },
  });

  const channel  = watch("channel");
  const isActive = watch("isActive");

  async function onSubmit(data: FormData) {
    const url    = isEdit ? `/api/v1/admin/templates/${template!.id}` : "/api/v1/admin/templates";
    const method = isEdit ? "PATCH" : "POST";

    const body = {
      ...data,
      eventType: data.eventType || null,
      subject:   data.channel === "email" ? (data.subject || null) : null,
    };

    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();

    if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }

    toast({ title: isEdit ? "Template updated" : "Template created" });
    reset();
    onSaved(json.data);
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Template Name</Label>
            <Input id="name" placeholder="e.g. Wedding Reminder (Swahili)" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Channel + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={watch("channel")} onValueChange={v => setValue("channel", v as FormData["channel"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.channel && <p className="text-xs text-red-500">{errors.channel.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Notification Type</Label>
              <Select value={watch("type")} onValueChange={v => setValue("type", v as FormData["type"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIF_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
            </div>
          </div>

          {/* Event Type + Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Event Type <span className="text-gray-400">(optional)</span></Label>
              <Select
                value={watch("eventType") ?? "any"}
                onValueChange={v => setValue("eventType", v === "any" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Any event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Language</Label>
              <Select value={watch("language")} onValueChange={v => setValue("language", v as "en"|"sw")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-1">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="e.g. Your invitation to {venue}" {...register("subject")} />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1">
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              {...register("message")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y min-h-[120px] max-h-[360px]"
              placeholder={channel === "email"
                ? "Dear {name}, you are cordially invited to…"
                : "Hi {name}! Reminder: event on {date} at {venue}."}
            />
            <p className="text-xs text-gray-400">
              Variables: <code>{"{name}"}</code> · <code>{"{date}"}</code> · <code>{"{venue}"}</code>
            </p>
            {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setValue("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">Active (available when composing)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              {isEdit ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
