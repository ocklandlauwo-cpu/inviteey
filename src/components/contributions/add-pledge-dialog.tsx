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
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  inviteeId: z.string().min(1, "Select a guest"),
  type:      z.enum(["fixed", "flexible"]).default("fixed"),
  amount:    z.string().min(1).regex(/^\d+$/, "Enter a whole number"),
  notes:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Invitee { id: number; name: string; phone: string | null }
interface Props {
  open:      boolean;
  onClose:   () => void;
  onAdded:   () => void;
  eventId:   number;
  invitees:  Invitee[];
}

export function AddPledgeDialog({ open, onClose, onAdded, eventId, invitees }: Props) {
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: { type: "fixed" },
    });

  const type      = watch("type");
  const inviteeId = watch("inviteeId");

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/pledges`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          inviteeId: parseInt(data.inviteeId, 10),
          type:      data.type,
          amount:    parseInt(data.amount, 10),
          notes:     data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Pledge added" });
      reset();
      onAdded();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pledge</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Guest *</Label>
            <Combobox
              value={inviteeId ?? ""}
              onChange={v => setValue("inviteeId", v, { shouldValidate: true })}
              placeholder="Select guest…"
              searchPlaceholder="Search guests…"
              emptyText="No guests found."
              options={invitees.map(inv => ({
                value: String(inv.id),
                label: `${inv.name}${inv.phone ? ` · ${inv.phone}` : ""}`,
              }))}
            />
            {errors.inviteeId && <p className="text-xs text-red-500">{errors.inviteeId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setValue("type", v as "fixed" | "flexible")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (TZS) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="50000"
                {...register("amount")}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="e.g. Cash pledge" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Add Pledge
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
