"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  amount: z.string().min(1).regex(/^\d+$/, "Enter a whole number"),
  paidAt: z.string().min(1),
  notes:  z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Pledge {
  id:     number;
  amount: string;
  invitee: { name: string };
  payments: { amount: string }[];
}

interface Props {
  open:       boolean;
  onClose:    () => void;
  onRecorded: () => void;
  eventId:    number;
  pledge:     Pledge;
}

export function RecordPaymentDialog({ open, onClose, onRecorded, eventId, pledge }: Props) {
  const { toast } = useToast();

  const paid      = pledge.payments.reduce((s, p) => s + parseInt(p.amount), 0);
  const remaining = parseInt(pledge.amount) - paid;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: {
        amount: remaining > 0 ? remaining.toString() : "",
        paidAt: new Date().toISOString().slice(0, 16),
      },
    });

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/pledges/${pledge.id}/payments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount: parseInt(data.amount, 10),
          paidAt: new Date(data.paidAt).toISOString(),
          notes:  data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Payment recorded" });
      reset();
      onRecorded();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{pledge.invitee.name}</span>
          {" · "}Pledged {parseInt(pledge.amount).toLocaleString("en")} TZS
          {paid > 0 && ` · ${paid.toLocaleString("en")} paid`}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Received (TZS) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={remaining > 0 ? remaining : undefined}
              {...register("amount")}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Date &amp; Time</Label>
            <Input id="paidAt" type="datetime-local" {...register("paidAt")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payNotes">Notes</Label>
            <Input id="payNotes" placeholder="e.g. M-Pesa #XY123" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
