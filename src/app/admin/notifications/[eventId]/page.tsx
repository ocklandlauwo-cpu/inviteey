import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { NotificationStatusClient } from "@/components/notifications/notification-status-client";

export default async function AdminEventNotificationsPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where:  { id: eventId, deletedAt: null },
    select: {
      id: true, name: true,
      organizer: { select: { name: true, email: true } },
    },
  });
  if (!event) notFound();

  const notifications = await prisma.notification.findMany({
    where:   { eventId },
    include: {
      recipients: {
        select: {
          id:     true,
          status: true,
          invitee: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/notifications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft size={14} /> Back to Notifications
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900">{event.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Notification status for {event.organizer.name} ({event.organizer.email})
        </p>
      </div>

      <NotificationStatusClient
        eventId={event.id}
        initialNotifications={notifications as Parameters<typeof NotificationStatusClient>[0]["initialNotifications"]}
      />
    </div>
  );
}
