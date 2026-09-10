import { notFound, redirect } from "next/navigation";
import { getSession }     from "@/lib/auth";
import { prisma }         from "@/lib/prisma";
import { getInviteeLimit, getInviteeLimitWarning } from "@/lib/tier-access";
import { InviteesClient } from "@/components/invitees/invitees-client";

interface Props { params: { eventId: string } }

export default async function InviteesPage({ params }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: user.role === "admin"
      ? { id: eventId, deletedAt: null }
      : { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  const invitees = await prisma.invitee.findMany({
    where:   { eventId, deletedAt: null },
    orderBy: { id: "asc" },
  });

  const limit       = getInviteeLimit(event.tier);
  const limitStatus = getInviteeLimitWarning(invitees.length, limit);

  return (
    <InviteesClient
      event={event}
      initialInvitees={invitees}
      limit={limit}
      limitStatus={limitStatus}
    />
  );
}
