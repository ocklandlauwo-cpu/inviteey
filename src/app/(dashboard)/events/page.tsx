import Link from "next/link";
import { Plus, Calendar, Users, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { Button }     from "@/components/ui/button";
import { Badge }      from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPE_LABELS, TIER_LABELS } from "@/types";

export default async function EventsPage() {
  const { user } = await getSession();
  const userId   = parseInt(user!.id, 10);

  const events = await prisma.event.findMany({
    where:   { organizerId: userId, deletedAt: null },
    include: { _count: { select: { invitees: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Events</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your events in one place</p>
        </div>
        <Link href="/events/new">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Plus size={16} /> New Event
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Calendar size={36} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No events yet</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Create your first event to start managing invitations, RSVPs, and contributions.
          </p>
          <Link href="/events/new">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <Plus size={16} /> Create Your First Event
            </Button>
          </Link>
        </div>
      )}

      {/* Event grid */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(event => (
            <Link key={event.id} href={`/events/${event.id}`} className="group block">
              <div className="bg-white rounded-2xl border border-warm-200 p-5 hover:border-amber-200 hover:shadow-md transition-all h-full flex flex-col">
                {/* Cover image placeholder */}
                <div className="w-full h-32 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-4 relative overflow-hidden">
                  <span className="text-4xl">
                    {event.type === "wedding" ? "💍" :
                     event.type === "birthday" ? "🎂" :
                     event.type === "sendoff" ? "✈️" :
                     event.type === "kitchen_party" ? "🍳" :
                     event.type === "corporate" ? "💼" :
                     event.type === "fundraising" ? "🤝" : "🎉"}
                  </span>
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={
                        event.status === "active"    ? "success" :
                        event.status === "draft"     ? "secondary" :
                        event.status === "completed" ? "info" :
                        event.status === "cancelled" ? "destructive" : "default"
                      }
                      className="text-xs"
                    >
                      {event.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                      {event.name}
                    </h3>
                    <Badge variant={event.tier as "basic" | "standard" | "premium" | "royal"} className="shrink-0 text-xs">
                      {TIER_LABELS[event.tier]}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">{EVENT_TYPE_LABELS[event.type]}</p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} className="text-gray-400" />
                      {formatDate(event.eventDate)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users size={12} className="text-gray-400" />
                      {event._count.invitees} / {event.inviteeLimit} guests
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
