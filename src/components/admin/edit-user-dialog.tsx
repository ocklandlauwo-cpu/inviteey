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
import type { UserRole } from "@prisma/client";

const ROLES = ["organizer", "admin", "vendor", "staff"] as const;

export const ROLE_LABEL: Record<string, string> = {
  organizer: "Organizer", admin: "Admin", vendor: "Vendor", staff: "Staff",
};

const schema = z.object({
  name:  z.string().min(2, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role:  z.enum(ROLES),
});

type FormData = z.infer<typeof schema>;

export interface EditableUser {
  id:    number;
  name:  string;
  email: string;
  phone: string | null;
  role:  UserRole;
}

interface Props {
  open:        boolean;
  onClose:     () => void;
  onSaved:     (user: EditableUser) => void;
  user:        EditableUser;
  isSelf:      boolean;
}

export function EditUserDialog({ open, onClose, onSaved, user, isSelf }: Props) {
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver:      zodResolver(schema),
      defaultValues: {
        name:  user.name,
        email: user.email,
        phone: user.phone ?? "",
        role:  user.role,
      },
    });

  const role = watch("role");

  React.useEffect(() => {
    if (open) {
      reset({
        name:  user.name,
        email: user.email,
        phone: user.phone ?? "",
        role:  user.role,
      });
    }
  }, [open, user, reset]);

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch(`/api/v1/admin/users/${user.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:  data.name,
          email: data.email,
          phone: data.phone || null,
          ...(isSelf ? {} : { role: data.role }),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      toast({ title: "User updated" });
      onSaved(json.data);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="e.g. Jane Doe" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="e.g. jane@email.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="e.g. +255700000000" {...register("phone")} />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={v => setValue("role", v as FormData["role"])}
              disabled={isSelf}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && <p className="text-xs text-gray-400">You cannot change your own role.</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
