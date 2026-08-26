"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function VendorNav({ name }: { name: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-warm-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size="xs" />
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-sm text-gray-500">Vendor Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">{name}</span>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            {signingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
