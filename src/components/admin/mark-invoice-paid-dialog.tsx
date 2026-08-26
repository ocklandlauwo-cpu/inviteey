"use client";

import * as React       from "react";
import { useForm }      from "react-hook-form";
import { zodResolver }  from "@hookform/resolvers/zod";
import { z }            from "zod";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const PAYMENT_METHODS = [
  { value: "mpesa",         label: "M-Pesa" },
  { value: "tigopesa",      label: "Tigo Pesa" },
  { value: "airtel_money",  label: "Airtel Money" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash",          label: "Cash" },
  { value: "other",         label: "Other" },
];

const schema = z.object({
  paymentMethod:   z.string().min(1, "Select a payment method"),
  referenceNumber: z.string().optional(),
  paidAt:          z.string().min(1, "Date is required"),
  notes:           z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  invoiceId:    string;
  invoiceLabel: string;
  open:         boolean;
  onClose:      () => void;
  onSuccess:    () => void;
}

export function MarkInvoicePaidDialog({ invoiceId, invoiceLabel, open, onClose, onSuccess }: Props) {
  const { toast } = useToast();

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: "mpesa",
      paidAt:        new Date().toISOString().slice(0, 10),
    },
  });

  const paymentMethod = watch("paymentMethod");

  async function onSubmit(data: FormData) {
    const res = await fetch(`/api/v1/admin/invoices/${invoiceId}/pay`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod:   data.paymentMethod,
        referenceNumber: data.referenceNumber || null,
        paidAt:          data.paidAt,
        notes:           data.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
    toast({ title: "Payment recorded", description: "Invoice marked as paid." });
    reset();
    onClose();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">
          For: <span className="font-medium text-gray-700">{invoiceLabel}</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Payment method */}
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

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>Reference # <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g. MPESA-ABC123" {...register("referenceNumber")} />
          </div>

          {/* Date paid */}
          <div className="space-y-1.5">
            <Label>Date Paid *</Label>
            <Input type="date" {...register("paidAt")} />
            {errors.paidAt && <p className="text-xs text-red-500">{errors.paidAt.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <textarea
              rows={2}
              {...register("notes")}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Mark as Paid
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
