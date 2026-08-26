import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 to-amber-50 flex flex-col">
      {/* Minimal header */}
      <header className="px-6 py-4">
        <Link href="/" className="w-fit block">
          <Logo size="sm" />
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Invitee &middot;{" "}
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
      </footer>
    </div>
  );
}
