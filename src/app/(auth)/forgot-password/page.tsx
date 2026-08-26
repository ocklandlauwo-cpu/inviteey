"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({ email: z.string().email("Please enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [sent, setSent] = React.useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch("/api/v1/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setSent(true);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-10 text-center">
          <Mail size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-6">
            If <span className="font-semibold text-gray-700">{getValues("email")}</span> is
            registered, you&apos;ll receive a password reset link shortly.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-8">
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={14} /> Back to login
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-500 text-sm mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Sending…</>
            ) : "Send Reset Link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
