"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { label: "About",        href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Templates",    href: "#templates" },
  { label: "Pricing",      href: "#pricing" },
  { label: "Contact",      href: "#contact" },
];

export function Navbar() {
  const [open,       setOpen]       = React.useState(false);
  const [scrolled,   setScrolled]   = React.useState(false);

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-warm-100 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/">
            <Logo size="sm" white={!scrolled} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-amber-500",
                  scrolled ? "text-gray-700" : "text-white/90"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className={cn(scrolled ? "text-gray-700 hover:text-gray-900" : "text-white hover:text-white hover:bg-white/10")}
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className={cn("lg:hidden p-2 rounded-lg", scrolled ? "text-gray-700" : "text-white")}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-white border-b border-warm-100 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-warm-50 hover:text-amber-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-warm-100">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
