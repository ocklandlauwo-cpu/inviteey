"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  password:        z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<Loader2 size={32} className="animate-spin text-amber-600" />}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}

function ResetPasswordForm() {
  const params    = useSearchParams();
  const router    = useRouter();
  const { toast } = useToast();
  const token     = params.get("token") ?? "";
  const [showPass, setShowPass] = React.useState(false);
  const [success, setSuccess]   = React.useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-10 text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white w-full">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-10 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Password Reset!</h1>
          <p className="text-gray-500 text-sm mb-6">Your password has been updated successfully.</p>
          <Link href="/login">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(data: FormData) {
    try {
      const res  = await fetch("/api/v1/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Reset failed", description: json.error, variant: "destructive" }); return; }
      setSuccess(true);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Set new password</h1>
          <p className="text-gray-500 text-sm mt-2">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="At least 8 characters"
                {...register("password")}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Resetting…</>
            ) : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
