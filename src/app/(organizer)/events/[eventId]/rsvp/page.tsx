import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { RsvpClient } from "@/components/rsvp/rsvp-client";

export default async function RsvpPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  const invitees = await prisma.invitee.findMany({
    where:   { eventId, deletedAt: null },
    include: {
      rsvpResponses: { orderBy: { respondedAt: "desc" }, take: 1 },
    },
    orderBy: { id: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">RSVP Management</h1>
      <RsvpClient
        event={event}
        initialInvitees={invitees}
      />
    </div>
  );
}
