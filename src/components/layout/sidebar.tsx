"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays, Settings,
  BarChart3, LogOut, Menu, X, ChevronRight,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import type { SessionUser } from "@/types";

const NAV = [
  { label: "Events",   href: "/events",   icon: CalendarDays },
  { label: "Reports",  href: "/reports",  icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function DashboardSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = React.useState(false);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-4 border-b border-warm-100">
        <Link href="/events" className="block w-fit" onClick={() => setOpen(false)}>
          <Logo size="sm" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-amber-50 text-amber-700"
                  : "text-gray-600 hover:bg-warm-100 hover:text-gray-900"
              )}
            >
              <item.icon size={18} className={active ? "text-amber-600" : "text-gray-400"} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto text-amber-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="px-3 pb-4 border-t border-warm-100 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-warm-50 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-warm-100 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-warm-100 px-4 h-14 flex items-center justify-between">
        <Link href="/events">
          <Logo size="xs" />
        </Link>
        <button onClick={() => setOpen(true)} className="p-2 text-gray-600">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-white h-full shadow-xl flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}
