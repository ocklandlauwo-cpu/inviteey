"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { Invitee } from "@prisma/client";

const schema = z.object({
  name:     z.string().min(2, "Name is required").max(200),
  phone:    z.string().optional(),
  email:    z.string().email("Invalid email").optional().or(z.literal("")),
  category: z.enum(["family","friends","colleagues","vip","other"]).default("other"),
  seatType: z.enum(["single","double"]).default("single"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSaved:  (inv: Invitee) => void;
  eventId:  number;
  invitee:  Invitee | null;
}

export function EditInviteeDialog({ open, onClose, onSaved, eventId, invitee }: Props) {
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { category: "other", seatType: "single" } });

  const category = watch("category");
  const seatType = watch("seatType");

  React.useEffect(() => {
    if (invitee) {
      reset({
        name:     invitee.name,
        phone:    invitee.phone ?? "",
        email:    invitee.email ?? "",
        category: invitee.category,
        seatType: ((invitee as unknown as { seatType?: string }).seatType ?? "single") as "single" | "double",
      });
    }
  }, [invitee, reset]);

  async function onSubmit(data: FormData) {
    if (!invitee) return;
    try {
      const res  = await fetch(`/api/v1/events/${eventId}/invitees/${invitee.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...data, email: data.email || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "Guest updated" });
      onSaved(json.data);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Guest</DialogTitle>
          <DialogDescription>Update this guest&apos;s details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-inv-name">Full Name *</Label>
            <Input id="edit-inv-name" placeholder="Guest name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-inv-phone">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="edit-inv-phone" type="tel" placeholder="+255 700 000 000" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-inv-email">Email <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="edit-inv-email" type="email" placeholder="guest@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={v => setValue("category", v as FormData["category"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="colleagues">Colleagues</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Seat Type</Label>
            <Select value={seatType} onValueChange={v => setValue("seatType", v as FormData["seatType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single — 1 person</SelectItem>
                <SelectItem value="double">Double — 2 people (different arrival times)</SelectItem>
              </SelectContent>
            </Select>
            {seatType === "double" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Double seats allow two guests to check in separately using the same e-card QR code.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? <><Loader2 size={14} className="mr-2 animate-spin" /> Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
