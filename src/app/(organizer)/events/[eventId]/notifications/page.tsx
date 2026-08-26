import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { NotificationStatusClient } from "@/components/notifications/notification-status-client";

export default async function NotificationsPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
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
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          Delivery status of guest notifications sent on your behalf by the Invitee team.
        </p>
      </div>
      <NotificationStatusClient
        eventId={event.id}
        initialNotifications={notifications as Parameters<typeof NotificationStatusClient>[0]["initialNotifications"]}
      />
    </div>
  );
}
