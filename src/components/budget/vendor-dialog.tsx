"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["catering", "photography", "decoration", "cake_champagne", "food", "drinks", "transport", "venue", "other"] as const;
const PAYMENT_STATUSES = ["unpaid", "partially_paid", "fully_paid"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  catering: "Catering", photography: "Photography", decoration: "Decoration",
  cake_champagne: "Cake & Champagne", food: "Food", drinks: "Drinks",
  transport: "Transport", venue: "Venue", other: "Other",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid", partially_paid: "Partially Paid", fully_paid: "Fully Paid",
};

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed", in_progress: "In Progress", completed: "Completed", issue_reported: "Issue Reported",
};

const schema = z.object({
  name:               z.string().min(1, "Name is required"),
  category:           z.enum(CATEGORIES),
  serviceDescription: z.string().optional(),
  estimatedCost:      z.string().regex(/^\d*$/, "Enter a whole number").optional(),
  agreedCost:         z.string().regex(/^\d*$/, "Enter a whole number").optional(),
  paymentStatus:      z.enum(PAYMENT_STATUSES),
  contactPhone:       z.string().optional(),
  notes:              z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export interface Vendor {
  id:                 number;
  name:               string;
  category:           string;
  serviceDescription: string | null;
  estimatedCost:      string | null;
  agreedCost:         string | null;
  paymentStatus:      string;
  deliveryStatus:     string;
  contactPhone:       string | null;
  contactEmail:       string | null;
  notes:              string | null;
}

interface Props {
  open:    boolean;
  onClose: () => void;
  onSaved: () => void;
  eventId: number;
  vendor?: Vendor | null;
}

export function VendorDialog({ open, onClose, onSaved, eventId, vendor }: Props) {
  const { toast } = useToast();
  const isEdit = !!vendor;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: {
        name:               vendor?.name ?? "",
        category:           (vendor?.category as FormData["category"]) ?? "other",
        serviceDescription: vendor?.serviceDescription ?? "",
        estimatedCost:      vendor?.estimatedCost ?? "",
        agreedCost:         vendor?.agreedCost ?? "",
        paymentStatus:      (vendor?.paymentStatus as FormData["paymentStatus"]) ?? "unpaid",
        contactPhone:       vendor?.contactPhone ?? "",
        notes:              vendor?.notes ?? "",
      },
    });

  const category      = watch("category");
  const paymentStatus = watch("paymentStatus");

  React.useEffect(() => {
    if (open) {
      reset({
        name:               vendor?.name ?? "",
        category:           (vendor?.category as FormData["category"]) ?? "other",
        serviceDescription: vendor?.serviceDescription ?? "",
        estimatedCost:      vendor?.estimatedCost ?? "",
        agreedCost:         vendor?.agreedCost ?? "",
        paymentStatus:      (vendor?.paymentStatus as FormData["paymentStatus"]) ?? "unpaid",
        contactPhone:       vendor?.contactPhone ?? "",
        notes:              vendor?.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendor]);

  async function onSubmit(data: FormData) {
    try {
      const url    = isEdit ? `/api/v1/events/${eventId}/budget/vendors/${vendor!.id}` : `/api/v1/events/${eventId}/budget/vendors`;
      const method = isEdit ? "PATCH" : "POST";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:               data.name,
          category:           data.category,
          serviceDescription: data.serviceDescription || undefined,
          estimatedCost:      data.estimatedCost ? parseInt(data.estimatedCost, 10) : null,
          agreedCost:         data.agreedCost ? parseInt(data.agreedCost, 10) : null,
          paymentStatus:      data.paymentStatus,
          contactPhone:       data.contactPhone || undefined,
          notes:              data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: isEdit ? "Vendor updated" : "Vendor added" });
      onSaved();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Budget Item" : "Add Budget Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input id="name" placeholder="e.g. Sunrise Caterers" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={v => setValue("category", v as FormData["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDescription">Service Description</Label>
              <Input id="serviceDescription" placeholder="e.g. 200-guest buffet" {...register("serviceDescription")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (TZS)</Label>
              <Input id="estimatedCost" type="number" min="0" placeholder="e.g. 1500000" {...register("estimatedCost")} />
              {errors.estimatedCost && <p className="text-xs text-red-500">{errors.estimatedCost.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreedCost">Agreed Cost (TZS)</Label>
              <Input id="agreedCost" type="number" min="0" placeholder="e.g. 1400000" {...register("agreedCost")} />
              {errors.agreedCost && <p className="text-xs text-red-500">{errors.agreedCost.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={v => setValue("paymentStatus", v as FormData["paymentStatus"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" placeholder="e.g. +255700000000" {...register("contactPhone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="e.g. Requires 50% deposit" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Add Budget Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
