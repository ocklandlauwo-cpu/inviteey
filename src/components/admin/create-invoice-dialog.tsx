"use client";

import * as React        from "react";
import { useForm }       from "react-hook-form";
import { zodResolver }   from "@hookform/resolvers/zod";
import { z }             from "zod";
import { Loader2, FilePlus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES } from "@/types";
import type { OrganizerOption, EventOption } from "./record-platform-payment-dialog";

const SERVICE_TYPES = [
  { value: "tier_standard",         label: "Tier — Standard" },
  { value: "tier_premium",          label: "Tier — Premium" },
  { value: "tier_royal",            label: "Tier — Royal" },
  { value: "sms_notification",      label: "SMS Notification" },
  { value: "whatsapp_notification", label: "WhatsApp Notification" },
  { value: "ecard_service",         label: "E-Card Service" },
  { value: "extra_invitees",        label: "Extra Invitees" },
  { value: "other",                 label: "Other" },
];

const schema = z.object({
  organizerId:  z.string().min(1, "Select an organizer"),
  eventId:      z.string().min(1, "Select an event"),
  serviceType:  z.string().min(1, "Select a service"),
  description:  z.string().optional(),
  amount:       z.string().min(1, "Amount required").refine(v => Number(v) > 0, "Must be > 0"),
  currencyCode: z.string().length(3).default("TZS"),
  dueDate:      z.string().optional(),
  notes:        z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  organizers: OrganizerOption[];
  onSuccess:  () => void;
}

export function CreateInvoiceDialog({ organizers, onSuccess }: Props) {
  const { toast }            = useToast();
  const [open, setOpen]      = React.useState(false);
  const [events, setEvents]  = React.useState<EventOption[]>([]);
  const [loadEvts, setLoadEvts] = React.useState(false);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currencyCode: "TZS" },
  });

  const organizerId  = watch("organizerId");
  const eventId      = watch("eventId");
  const serviceType  = watch("serviceType");
  const currencyCode = watch("currencyCode");

  React.useEffect(() => {
    if (!organizerId) { setEvents([]); setValue("eventId", ""); return; }
    setLoadEvts(true);
    fetch(`/api/v1/admin/users/${organizerId}/events`)
      .then(r => r.json())
      .then(j => { setEvents(j.data ?? []); setValue("eventId", ""); })
      .catch(() => setEvents([]))
      .finally(() => setLoadEvts(false));
  }, [organizerId, setValue]);

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/v1/admin/invoices", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizerId:  parseInt(data.organizerId, 10),
        eventId:      parseInt(data.eventId, 10),
        serviceType:  data.serviceType,
        description:  data.description || null,
        amount:       parseInt(data.amount, 10),
        currencyCode: data.currencyCode,
        dueDate:      data.dueDate || null,
        notes:        data.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
    toast({ title: "Invoice created successfully" });
    reset();
    setOpen(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <FilePlus size={16} /> Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Organizer */}
          <div className="space-y-1.5">
            <Label>Organizer *</Label>
            <Select value={organizerId} onValueChange={v => setValue("organizerId", v)}>
              <SelectTrigger><SelectValue placeholder="Select organizer" /></SelectTrigger>
              <SelectContent>
                {organizers.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.name} — {o.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizerId && <p className="text-xs text-red-500">{errors.organizerId.message}</p>}
          </div>

          {/* Event (required) */}
          <div className="space-y-1.5">
            <Label>Event *</Label>
            <Select
              value={eventId ?? ""}
              onValueChange={v => setValue("eventId", v)}
              disabled={!organizerId || loadEvts}
            >
              <SelectTrigger>
                <SelectValue placeholder={!organizerId ? "Select organizer first" : loadEvts ? "Loading…" : "Select event"} />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} <span className="text-gray-400 ml-1">({e.tier})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.eventId && <p className="text-xs text-red-500">{errors.eventId.message}</p>}
          </div>

          {/* Service type */}
          <div className="space-y-1.5">
            <Label>Service Type *</Label>
            <Select value={serviceType} onValueChange={v => setValue("serviceType", v)}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceType && <p className="text-xs text-red-500">{errors.serviceType.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Standard tier upgrade" {...register("description")} />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" min={1} placeholder="50000" {...register("amount")} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currencyCode} onValueChange={v => setValue("currencyCode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label>Due Date <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input type="date" {...register("dueDate")} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <textarea
              rows={2}
              placeholder="Internal notes…"
              {...register("notes")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
