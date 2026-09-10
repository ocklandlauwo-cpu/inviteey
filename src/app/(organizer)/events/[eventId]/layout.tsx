import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { Badge }      from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { TIER_LABELS, EVENT_TYPE_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { EventNavTabs } from "@/components/events/event-nav-tabs";

interface Props {
  children: React.ReactNode;
  params:   { eventId: string };
}

export default async function EventLayout({ children, params }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: user.role === "admin"
      ? { id: eventId, deletedAt: null }
      : { id: eventId, organizerId: userId, deletedAt: null },
    include: { _count: { select: { invitees: { where: { deletedAt: null } } } } },
  });
  if (!event) notFound();

  return (
    <div className="flex min-h-screen bg-warm-50">
      <DashboardSidebar user={user} />

      <div className="flex-1 min-w-0 lg:pl-64">
        {/* Event header */}
        <div className="bg-white border-b border-warm-200 px-4 sm:px-6 lg:px-8 pt-4 pb-0 lg:pt-6">
          <div className="max-w-7xl mx-auto">
            <nav className="text-xs text-gray-400 mb-1.5">
              <Link href="/events" className="hover:text-gray-600 transition-colors">Events</Link>
              {" / "}
              <span className="text-gray-600 truncate">{event.name}</span>
            </nav>

            <div className="flex items-start gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{event.name}</h1>
              <Badge variant={event.tier as "basic" | "standard" | "premium" | "royal"}>
                {TIER_LABELS[event.tier]}
              </Badge>
              <Badge
                variant={
                  event.status === "active"    ? "success" :
                  event.status === "draft"     ? "secondary" :
                  event.status === "completed" ? "info" :
                  event.status === "cancelled" ? "error" : "default"
                }
              >
                {event.status}
              </Badge>
            </div>

            <p className="text-sm text-gray-500">
              {EVENT_TYPE_LABELS[event.type]} &middot; {formatDate(event.eventDate)} &middot; {event.venueName}
            </p>

            <EventNavTabs eventId={eventId} tier={event.tier} />
          </div>
        </div>

        {/* Page content */}
        <main id="main-content" className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
