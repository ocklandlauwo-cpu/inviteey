import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";
import { EcardsClient }              from "@/components/ecards/ecards-client";
import type { InviteeRow }           from "@/components/ecards/ecards-client";
import { TierUpgradeBanner } from "@/components/events/tier-upgrade-banner";

export default async function EcardsPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  if (!canAccessFeature(event.tier, "ecard")) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">E-Cards</h1>
        <TierUpgradeBanner
          status="at_limit"
          current={0}
          limit={0}
          eventId={event.id}
          tier={event.tier}
        />
      </div>
    );
  }

  const templates = await prisma.ecardTemplate.findMany({
    where:   { eventType: event.type, isActive: true },
    orderBy: { name: "asc" },
  });

  /* seatType and pin are real DB columns added via direct SQL migration.
     Prisma's generated client may not reflect them until `prisma generate` is re-run,
     so we cast to the explicit InviteeRow shape we own. */
  const invitees = (await prisma.invitee.findMany({
    where:   { eventId, deletedAt: null },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select:  {
      id: true, name: true, phone: true, email: true,
      seatType: true, pin: true,
      ecards: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, imagePath: true, sentAt: true },
      },
    } as any,
    orderBy: { id: "asc" },
  })) as unknown as InviteeRow[];

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">E-Cards</h1>
      <EcardsClient
        eventId={event.id}
        templates={templates}
        initialInvitees={invitees}
        initialTemplateId={event.ecardTemplateId}
      />
    </div>
  );
}
