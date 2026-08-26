"use client";

import * as React         from "react";
import { useForm }        from "react-hook-form";
import { zodResolver }    from "@hookform/resolvers/zod";
import { z }              from "zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES } from "@/types";

const SERVICE_TYPES = [
  { value: "tier_standard",        label: "Tier — Standard" },
  { value: "tier_premium",         label: "Tier — Premium" },
  { value: "tier_royal",           label: "Tier — Royal" },
  { value: "sms_notification",     label: "SMS Notification" },
  { value: "whatsapp_notification",label: "WhatsApp Notification" },
  { value: "ecard_service",        label: "E-Card Service" },
  { value: "extra_invitees",       label: "Extra Invitees" },
  { value: "other",                label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "mpesa",        label: "M-Pesa" },
  { value: "tigopesa",     label: "Tigo Pesa" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "bank_transfer",label: "Bank Transfer" },
  { value: "cash",         label: "Cash" },
  { value: "other",        label: "Other" },
];

const schema = z.object({
  organizerId:     z.string().min(1, "Select an organizer"),
  eventId:         z.string().optional(),
  serviceType:     z.string().min(1, "Select a service type"),
  description:     z.string().optional(),
  amount:          z.string().min(1, "Amount is required").refine(v => Number(v) > 0, "Must be > 0"),
  currencyCode:    z.string().length(3).default("TZS"),
  paymentMethod:   z.string().min(1, "Select a payment method"),
  referenceNumber: z.string().optional(),
  status:          z.enum(["confirmed", "refunded"]).default("confirmed"),
  paidAt:          z.string().min(1, "Date is required"),
  notes:           z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export interface OrganizerOption {
  id: number;
  name: string;
  email: string;
}

export interface EventOption {
  id: number;
  name: string;
  type: string;
  tier: string;
}

interface ExistingPayment {
  id: string;
  organizerId: number;
  eventId: number | null;
  serviceType: string;
  description: string | null;
  amount: number;
  currencyCode: string;
  paymentMethod: string;
  referenceNumber: string | null;
  status: string;
  paidAt: string;
  notes: string | null;
}

interface Props {
  organizers: OrganizerOption[];
  onSuccess: () => void;
  existing?: ExistingPayment;
  trigger?: React.ReactNode;
}

export function RecordPlatformPaymentDialog({ organizers, onSuccess, existing, trigger }: Props) {
  const { toast }              = useToast();
  const [open, setOpen]        = React.useState(false);
  const [events, setEvents]    = React.useState<EventOption[]>([]);
  const [loadingEvts, setLoadingEvts] = React.useState(false);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          organizerId:     String(existing.organizerId),
          eventId:         existing.eventId ? String(existing.eventId) : "",
          serviceType:     existing.serviceType,
          description:     existing.description ?? "",
          amount:          String(existing.amount),
          currencyCode:    existing.currencyCode,
          paymentMethod:   existing.paymentMethod,
          referenceNumber: existing.referenceNumber ?? "",
          status:          existing.status as "confirmed" | "refunded",
          paidAt:          existing.paidAt.slice(0, 10),
          notes:           existing.notes ?? "",
        }
      : {
          currencyCode:  "TZS",
          paymentMethod: "mpesa",
          status:        "confirmed",
          paidAt:        new Date().toISOString().slice(0, 10),
        },
  });

  const organizerId   = watch("organizerId");
  const serviceType   = watch("serviceType");
  const paymentMethod = watch("paymentMethod");
  const currencyCode  = watch("currencyCode");
  const status        = watch("status");

  React.useEffect(() => {
    if (!organizerId) { setEvents([]); return; }
    setLoadingEvts(true);
    fetch(`/api/v1/admin/users/${organizerId}/events`)
      .then(r => r.json())
      .then(j => setEvents(j.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvts(false));
  }, [organizerId]);

  async function onSubmit(data: FormData) {
    const url    = existing ? `/api/v1/admin/payments/${existing.id}` : "/api/v1/admin/payments";
    const method = existing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizerId:     parseInt(data.organizerId, 10),
        eventId:         data.eventId ? parseInt(data.eventId, 10) : null,
        serviceType:     data.serviceType,
        description:     data.description || null,
        amount:          parseInt(data.amount, 10),
        currencyCode:    data.currencyCode,
        paymentMethod:   data.paymentMethod,
        referenceNumber: data.referenceNumber || null,
        status:          data.status,
        paidAt:          data.paidAt,
        notes:           data.notes || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: json.error, variant: "destructive" });
      return;
    }

    toast({ title: existing ? "Payment updated" : "Payment recorded successfully" });
    reset();
    setOpen(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Plus size={16} /> Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Payment" : "Record Platform Payment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Organizer */}
          <div className="space-y-1.5">
            <Label>Organizer *</Label>
            <Select value={organizerId} onValueChange={v => { setValue("organizerId", v); setValue("eventId", ""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select organizer" />
              </SelectTrigger>
              <SelectContent>
                {organizers.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name} — {o.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizerId && <p className="text-xs text-red-500">{errors.organizerId.message}</p>}
          </div>

          {/* Event (optional) */}
          <div className="space-y-1.5">
            <Label>Event <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Select
              value={watch("eventId") ?? ""}
              onValueChange={v => setValue("eventId", v === "__none__" ? "" : v)}
              disabled={!organizerId || loadingEvts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingEvts ? "Loading…" : "None / General"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None / General</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} ({e.tier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Input placeholder="e.g. Tier upgrade for wedding event" {...register("description")} />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" min={1} placeholder="50000" {...register("amount")} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Currency *</Label>
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

          {/* Payment method + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={v => setValue("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentMethod && <p className="text-xs text-red-500">{errors.paymentMethod.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Reference # <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input placeholder="e.g. MPESA-ABC123" {...register("referenceNumber")} />
            </div>
          </div>

          {/* Date paid + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date Paid *</Label>
              <Input type="date" {...register("paidAt")} />
              {errors.paidAt && <p className="text-xs text-red-500">{errors.paidAt.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setValue("status", v as "confirmed" | "refunded")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : existing ? <Pencil size={14} /> : <Plus size={14} />}
              {existing ? "Save Changes" : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
