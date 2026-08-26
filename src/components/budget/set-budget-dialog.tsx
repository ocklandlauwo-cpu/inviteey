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
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  totalBudget: z.string().regex(/^\d*$/, "Enter a whole number").optional(),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSaved:  () => void;
  eventId:  number;
  current:  { totalBudget: string | null; notes: string | null } | null;
}

export function SetBudgetDialog({ open, onClose, onSaved, eventId, current }: Props) {
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: {
        totalBudget: current?.totalBudget ?? "",
        notes:       current?.notes ?? "",
      },
    });

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/budget`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          totalBudget: data.totalBudget ? parseInt(data.totalBudget, 10) : null,
          notes:       data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Budget updated" });
      onSaved();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Event Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="totalBudget">Total Budget (TZS)</Label>
            <Input
              id="totalBudget"
              type="number"
              min="0"
              placeholder="e.g. 5000000"
              {...register("totalBudget")}
            />
            {errors.totalBudget && <p className="text-xs text-red-500">{errors.totalBudget.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="e.g. Includes venue & catering" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
