import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck, DollarSign, QrCode, ArrowUpRight, Settings } from "lucide-react";
import { getSession }     from "@/lib/auth";
import { prisma }         from "@/lib/prisma";
import { Button }         from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getInviteeLimit, getInviteeLimitWarning } from "@/lib/tier-access";
import { TIER_LABELS }    from "@/types";
import { TierUpgradeBanner }    from "@/components/events/tier-upgrade-banner";
import { EventStatusActions }   from "@/components/events/event-status-actions";
import { PostEventSummary }     from "@/components/events/post-event-summary";

interface Props { params: { eventId: string } }

export default async function EventOverviewPage({ params }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where:   { id: eventId, organizerId: userId, deletedAt: null },
    include: {
      _count: {
        select: {
          invitees:  { where: { deletedAt: null } },
          checkins:  true,
          pledges:   { where: { deletedAt: null } },
          payments:  { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!event) notFound();

  const totalPledged   = await prisma.pledge.aggregate({ where: { eventId, deletedAt: null }, _sum: { amount: true } });
  const totalCollected = await prisma.payment.aggregate({ where: { eventId, deletedAt: null }, _sum: { amount: true } });
  const rsvpCounts     = await prisma.invitee.groupBy({
    by:    ["rsvpStatus"],
    where: { eventId, deletedAt: null },
    _count: { rsvpStatus: true },
  });

  const limit       = getInviteeLimit(event.tier);
  const current     = event._count.invitees;
  const limitStatus = getInviteeLimitWarning(current, limit);

  const confirmedRsvp = rsvpCounts.find(r => r.rsvpStatus === "confirmed")?._count.rsvpStatus ?? 0;
  const declinedRsvp  = rsvpCounts.find(r => r.rsvpStatus === "declined")?._count.rsvpStatus  ?? 0;

  const stats = [
    {
      label: "Total Guests",
      value: `${current}`,
      sub:   `of ${limit} allowed`,
      icon:  Users,
      color: "text-blue-600 bg-blue-50",
      href:  `${eventId}/invitees`,
    },
    {
      label: "RSVP Confirmed",
      value: `${confirmedRsvp}`,
      sub:   `${declinedRsvp} declined`,
      icon:  UserCheck,
      color: "text-green-600 bg-green-50",
      href:  `${eventId}/rsvp`,
    },
    {
      label: "Checked In",
      value: `${event._count.checkins}`,
      sub:   `of ${confirmedRsvp} confirmed`,
      icon:  QrCode,
      color: "text-amber-600 bg-amber-50",
      href:  `${eventId}/checkin`,
    },
    {
      label: "Total Pledged",
      value: `TSh ${(totalPledged._sum.amount ?? BigInt(0)).toLocaleString("en")}`,
      sub:   `TSh ${(totalCollected._sum.amount ?? BigInt(0)).toLocaleString("en")} collected`,
      icon:  DollarSign,
      color: "text-purple-600 bg-purple-50",
      href:  `${eventId}/contributions`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tier limit warning */}
      {(limitStatus === "warning" || limitStatus === "at_limit" || limitStatus === "over_limit") && (
        <TierUpgradeBanner status={limitStatus} current={current} limit={limit} eventId={eventId} tier={event.tier} />
      )}

      {/* Event lifecycle actions */}
      <EventStatusActions eventId={eventId} status={event.status} />

      {/* Post-event AI summary — only for completed events */}
      {event.status === "completed" && <PostEventSummary eventId={eventId} />}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={`/events/${stat.href}`} className="group">
            <div className="bg-white rounded-2xl border border-warm-200 p-5 hover:border-amber-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <ArrowUpRight size={14} className="text-gray-300 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Event details card */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Event Details</h2>
          <Link href={`/events/${eventId}/settings`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings size={14} /> Edit
            </Button>
          </Link>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {[
            { label: "Date & Time",    value: formatDate(event.eventDate) },
            { label: "Venue",          value: event.venueName },
            { label: "Address",        value: event.venueAddress ?? "—" },
            { label: "Language",       value: event.language === "en" ? "English" : "Swahili" },
            { label: "Currency",       value: event.currencyCode },
            { label: "Plan",           value: TIER_LABELS[event.tier] },
            { label: "Status",         value: event.status },
            {
              label: "Tier Activated",
              value: event.tierActivatedAt ? formatDate(event.tierActivatedAt) : "Not yet",
            },
          ].map(item => (
            <div key={item.label}>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</dt>
              <dd className="text-sm text-gray-900 mt-0.5 capitalize">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
