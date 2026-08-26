import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";
import { ContributionsClient } from "@/components/contributions/contributions-client";
import { TierUpgradeBanner } from "@/components/events/tier-upgrade-banner";

export default async function ContributionsPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  const hasContributions = canAccessFeature(event.tier, "contributions");

  if (!hasContributions) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Contributions</h1>
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

  const pledges = await prisma.pledge.findMany({
    where:   { eventId, deletedAt: null },
    include: {
      invitee:  { select: { id: true, name: true, phone: true } },
      payments: { where: { deletedAt: null }, select: { id: true, amount: true, paidAt: true, notes: true } },
    },
    orderBy: { id: "asc" },
  });

  const invitees = await prisma.invitee.findMany({
    where:   { eventId, deletedAt: null },
    select:  { id: true, name: true, phone: true },
    orderBy: { id: "asc" },
  });

  /* Serialize BigInt for client */
  const serialized = pledges.map(p => ({
    ...p,
    amount:   p.amount.toString(),
    payments: p.payments.map(pay => ({ ...pay, amount: pay.amount.toString() })),
  }));

  return (
    <ContributionsClient
      eventId={event.id}
      pledges={serialized}
      invitees={invitees}
    />
  );
}
