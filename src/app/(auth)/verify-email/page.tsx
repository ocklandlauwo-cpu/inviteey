"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, MailOpen, CheckCircle2, XCircle } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<Loader2 size={32} className="animate-spin text-amber-600" />}>
      <VerifyEmailForm />
    </React.Suspense>
  );
}

function VerifyEmailForm() {
  const params     = useSearchParams();
  const router     = useRouter();
  const { toast }  = useToast();
  const email      = params.get("email") ?? "";
  const token      = params.get("token") ?? "";

  const [pin,      setPin]    = React.useState(token);
  const [status,   setStatus] = React.useState<"idle" | "verifying" | "success" | "error">("idle");
  const [resending, setResending] = React.useState(false);

  /* Auto-verify if token came in query string */
  React.useEffect(() => {
    if (token) verify(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(code: string) {
    setStatus("verifying");
    try {
      const res  = await fetch("/api/v1/auth/verify-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: code }),
      });
      const json = await res.json();
      if (!res.ok) { setStatus("error"); toast({ title: "Verification failed", description: json.error, variant: "destructive" }); return; }
      setStatus("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setStatus("error");
    }
  }

  async function resend() {
    setResending(true);
    try {
      await fetch("/api/v1/auth/verify-email", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      toast({ title: "Code resent", description: "Check your inbox." });
    } catch {
      toast({ title: "Failed to resend", variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  if (status === "success") {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-10 text-center">
          <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-500 text-sm">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  if (status === "error" && !pin) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-10 text-center">
          <XCircle size={56} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-500 text-sm mb-6">The link may have expired. Request a new one.</p>
          <Button onClick={resend} disabled={resending} className="bg-amber-600 hover:bg-amber-700 text-white">
            {resending ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Resend Email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-8 text-center">
        <MailOpen size={48} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-6">
          We sent a verification code to{" "}
          <span className="font-semibold text-gray-700">{email || "your email"}</span>.
          Enter it below.
        </p>

        <div className="text-left space-y-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="pin">Verification Code</Label>
            <Input
              id="pin"
              placeholder="Enter 6-digit code"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={64}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button
            onClick={() => verify(pin)}
            disabled={!pin || status === "verifying"}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {status === "verifying" ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Verifying…</>
            ) : "Verify Email"}
          </Button>
        </div>

        <p className="text-sm text-gray-400">
          Didn&apos;t receive the code?{" "}
          <button
            onClick={resend}
            disabled={resending}
            className="text-amber-600 hover:underline font-medium"
          >
            {resending ? "Sending…" : "Resend"}
          </button>
        </p>
      </div>
    </div>
  );
}
