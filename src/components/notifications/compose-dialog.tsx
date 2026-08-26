"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, LayoutTemplate, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { InviteeSelectDialog, type InviteeOption } from "@/components/notifications/invitee-select-dialog";
import type { EventTier } from "@prisma/client";

const schema = z.object({
  type:           z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","cancellation"]).default("reminder"),
  channel:        z.enum(["sms", "whatsapp", "email"]),
  recipientGroup: z.enum(["all","by_category","by_status","by_contribution","selected"]).default("all"),
  subject:        z.string().max(300).optional(),
  message:        z.string().min(1, "Message is required").max(2000),
  language:       z.enum(["en","sw"]).default("en"),
  dispatch:       z.boolean().default(true),
  categoryFilter: z.string().optional(),
  statusFilter:   z.enum(["rsvp_pending","rsvp_confirmed","rsvp_declined","checked_in","not_arrived"]).optional(),
  contributionStatusFilter: z.array(z.enum(["unpaid","partially_paid","fully_paid"])).default([]),
  selectedInviteeIds:       z.array(z.number()).default([]),
});

type FormData = z.infer<typeof schema>;

const NOTIF_TYPE_LABELS: Record<string, string> = {
  reminder:              "Reminder",
  invitation:            "Invitation",
  rsvp_followup:         "RSVP Follow-up",
  contribution_reminder: "Contribution Reminder",
  cancellation:          "Cancellation",
};

const CATEGORY_LABELS: Record<string, string> = {
  family: "Family", friends: "Friends", colleagues: "Colleagues",
  vip: "VIP", other: "Other",
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  rsvp_pending:   "Pending RSVP",
  rsvp_confirmed: "Confirmed RSVP",
  rsvp_declined:  "Declined RSVP",
  checked_in:     "Checked In",
  not_arrived:    "Not Yet Arrived",
};

const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  unpaid:         "Unpaid",
  partially_paid: "Partial Paid",
  fully_paid:     "Full Paid",
};

interface Props {
  open:          boolean;
  onClose:       () => void;
  onSent:        () => void;
  eventId:       number;
  tier:          EventTier;
  hasSms:        boolean;
  hasWhatsApp:   boolean;
  initialValues?: Partial<FormData>;
}

const DEFAULT_VALUES: FormData = {
  type: "reminder", channel: "email", message: "",
  recipientGroup: "all", dispatch: true, language: "en",
  contributionStatusFilter: [], selectedInviteeIds: [],
};

export function ComposeNotificationDialog({
  open, onClose, onSent, eventId, hasSms, hasWhatsApp, initialValues,
}: Props) {
  const { toast } = useToast();
  const [contributionInvitees, setContributionInvitees] = React.useState<InviteeOption[]>([]);
  const [loadingInvitees, setLoadingInvitees]           = React.useState(false);
  const [showInviteeDialog, setShowInviteeDialog]       = React.useState(false);
  const [templates, setTemplates]                       = React.useState<Array<{ id: number; name: string; channel: string; type: string; language: string; subject: string | null; message: string }>>([]);
  const [showTemplatePicker, setShowTemplatePicker]     = React.useState(false);
  const [suggesting,         setSuggesting]             = React.useState(false);

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
  });

  React.useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, ...initialValues });
      setContributionInvitees([]);
      setShowTemplatePicker(false);
      fetch("/api/v1/admin/templates?activeOnly=true")
        .then(r => r.json())
        .then(j => { if (j.data) setTemplates(j.data); })
        .catch(() => {/* non-fatal */});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const channel        = watch("channel");
  const recipientGroup = watch("recipientGroup");
  const dispatch       = watch("dispatch");
  const type           = watch("type");
  const language       = watch("language");
  const categoryFilter = watch("categoryFilter");
  const statusFilter   = watch("statusFilter");
  const contributionStatusFilter = watch("contributionStatusFilter");
  const selectedInviteeIds        = watch("selectedInviteeIds");

  /* Fetch invitees matching the selected contribution-status filters */
  React.useEffect(() => {
    if (recipientGroup !== "by_contribution" || contributionStatusFilter.length === 0) {
      setContributionInvitees([]);
      setValue("selectedInviteeIds", []);
      return;
    }
    let cancelled = false;
    setLoadingInvitees(true);
    fetch(`/api/v1/events/${eventId}/notifications/recipients?contributionStatus=${contributionStatusFilter.join(",")}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        const invitees: InviteeOption[] = json.data ?? [];
        setContributionInvitees(invitees);
        setValue("selectedInviteeIds", invitees.map(i => i.id));
      })
      .finally(() => { if (!cancelled) setLoadingInvitees(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientGroup, JSON.stringify(contributionStatusFilter), eventId]);

  function toggleContributionStatus(status: "unpaid" | "partially_paid" | "fully_paid") {
    const current = contributionStatusFilter;
    setValue(
      "contributionStatusFilter",
      current.includes(status) ? current.filter(s => s !== status) : [...current, status]
    );
  }

  async function suggestWithAI() {
    setSuggesting(true);
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/notifications/suggest`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type, channel, language }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error ?? "AI suggestion failed", variant: "destructive" }); return; }
      setValue("message", json.message, { shouldDirty: true });
      toast({ title: "AI suggestion applied — feel free to edit it!" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find(x => String(x.id) === id);
    if (!t) return;
    setValue("channel",  t.channel  as FormData["channel"]);
    setValue("type",     t.type     as FormData["type"]);
    setValue("language", t.language as FormData["language"]);
    setValue("message",  t.message);
    if (t.subject) setValue("subject", t.subject);
    setShowTemplatePicker(false);
    toast({ title: `Template "${t.name}" applied` });
  }

  async function onSubmit(data: FormData) {
    if (data.recipientGroup === "by_contribution" && data.selectedInviteeIds.length === 0) {
      toast({ title: "No recipients", description: "Select at least one contribution status with matching invitees.", variant: "destructive" });
      return;
    }

    const payload = data.recipientGroup === "by_contribution"
      ? { ...data, recipientGroup: "selected" as const, inviteeIds: data.selectedInviteeIds }
      : data;

    try {
      const res  = await fetch(`/api/v1/events/${eventId}/notifications`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: data.dispatch ? "Notification sent!" : "Saved as draft" });
      reset();
      onSent();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Notification</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              {showTemplatePicker ? (
                <div className="rounded-lg border border-warm-200 bg-warm-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pick a template</p>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Choose template…" /></SelectTrigger>
                    <SelectContent>
                      {templates
                        .filter(t => !channel || t.channel === channel)
                        .map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={() => setShowTemplatePicker(false)} className="text-xs text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  <LayoutTemplate size={13} /> Use a template
                </button>
              )}
            </div>
          )}

          {/* Type & Language row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setValue("type", v as FormData["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIF_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={language} onValueChange={v => setValue("language", v as "en" | "sw")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="flex gap-2">
              {(["email","sms","whatsapp"] as const).map(ch => {
                const disabled = (ch === "sms" && !hasSms) || (ch === "whatsapp" && !hasWhatsApp);
                return (
                  <button
                    key={ch}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setValue("channel", ch)}
                    className={`relative px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      channel === ch
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : disabled
                          ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                          : "border-gray-200 hover:border-amber-300 text-gray-600"
                    }`}
                  >
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    {disabled && (
                      <Badge variant="warning" className="absolute -top-2 -right-2 text-[9px] px-1 py-0">
                        Upgrade
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient group */}
          <div className="space-y-1.5">
            <Label>Send to</Label>
            <Select
              value={recipientGroup}
              onValueChange={v => setValue("recipientGroup", v as FormData["recipientGroup"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All guests</SelectItem>
                <SelectItem value="by_category">By category</SelectItem>
                <SelectItem value="by_status">By status</SelectItem>
                <SelectItem value="by_contribution">By contribution status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category sub-filter */}
          {recipientGroup === "by_category" && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryFilter ?? ""}
                onValueChange={v => setValue("categoryFilter", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status sub-filter */}
          {recipientGroup === "by_status" && (
            <div className="space-y-1.5">
              <Label>Filter by status</Label>
              <Select
                value={statusFilter ?? ""}
                onValueChange={v => setValue("statusFilter", v as FormData["statusFilter"])}
              >
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_FILTER_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contribution status sub-filter */}
          {recipientGroup === "by_contribution" && (
            <div className="space-y-1.5">
              <Label>Filter by contribution status</Label>
              <div className="flex gap-2 flex-wrap">
                {(["unpaid","partially_paid","fully_paid"] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleContributionStatus(status)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      contributionStatusFilter.includes(status)
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 hover:border-amber-300 text-gray-600"
                    }`}
                  >
                    {CONTRIBUTION_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>

              {contributionStatusFilter.length > 0 && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loadingInvitees || selectedInviteeIds.length === 0}
                    onClick={() => setShowInviteeDialog(true)}
                  >
                    {loadingInvitees ? "Loading…" : `View Invitees (${selectedInviteeIds.length})`}
                  </Button>
                  {!loadingInvitees && contributionInvitees.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No invitees match the selected status(es).</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="e.g. Your invitation details" {...register("subject")} />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message *</Label>
              <button
                type="button"
                onClick={suggestWithAI}
                disabled={suggesting}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
              >
                {suggesting
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} />}
                {suggesting ? "Generating…" : "Suggest with AI"}
              </button>
            </div>
            <textarea
              id="message"
              rows={4}
              placeholder={channel === "email"
                ? "Dear {name}, you are cordially invited to…"
                : "Hi {name}! Reminder: event on {date} at {venue}."
              }
              {...register("message")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y min-h-[100px] max-h-[400px]"
            />
            {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
            <p className="text-xs text-gray-400">
              Variables: <code>{"{name}"}</code> · <code>{"{date}"}</code> · <code>{"{venue}"}</code>
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" {...register("dispatch")} className="accent-amber-600 w-4 h-4" />
              Send immediately
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {dispatch ? "Send" : "Save Draft"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      <InviteeSelectDialog
        open={showInviteeDialog}
        onClose={() => setShowInviteeDialog(false)}
        invitees={contributionInvitees}
        selectedIds={selectedInviteeIds}
        onConfirm={ids => setValue("selectedInviteeIds", ids)}
      />
    </Dialog>
  );
}
