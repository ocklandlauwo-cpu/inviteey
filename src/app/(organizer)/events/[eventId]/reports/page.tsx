import { notFound, redirect } from "next/navigation";
import { getSession }        from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { canAccessFeature }  from "@/lib/tier-access";
import { ReportsClient }     from "@/components/reports/reports-client";
import { TierUpgradeBanner } from "@/components/events/tier-upgrade-banner";

export default async function ReportsPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  if (!canAccessFeature(event.tier, "reports")) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Reports</h1>
        <TierUpgradeBanner status="at_limit" current={0} limit={0} eventId={event.id} tier={event.tier} />
      </div>
    );
  }

  const [invitees, notifications] = await Promise.all([
    prisma.invitee.findMany({
      where:  { eventId, deletedAt: null },
      select: {
        category: true, rsvpStatus: true, checkinStatus: true,
        ecards: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, sentAt: true } },
      },
    }),
    prisma.notification.findMany({
      where:   { eventId },
      select:  {
        id:             true,
        channel:        true,
        recipientGroup: true,
        message:        true,
        status:         true,
        sentAt:         true,
        createdAt:      true,
        _count:         { select: { recipients: true } },
        recipients:     { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasContributions = canAccessFeature(event.tier, "contributions");
  const hasExportCsv     = canAccessFeature(event.tier, "exportCsv");
  const hasEcards        = canAccessFeature(event.tier, "ecard");

  let pledgeStats = { totalPledged: 0, totalCollected: 0, pledgeCount: 0 };
  if (hasContributions) {
    const pledges = await prisma.pledge.findMany({
      where:   { eventId, deletedAt: null },
      include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
    });
    pledgeStats = {
      pledgeCount:    pledges.length,
      totalPledged:   pledges.reduce((s, p) => s + Number(p.amount), 0),
      totalCollected: pledges.reduce((s, p) => s + p.payments.reduce((sum, pay) => sum + Number(pay.amount), 0), 0),
    };
  }

  const inviteeRows = invitees.map(inv => {
    const ecard = inv.ecards[0];
    const ecardStatus: "none" | "pending" | "processing" | "completed" | "failed" | "sent" =
      !ecard ? "none" : ecard.sentAt ? "sent" : ecard.status;
    return {
      category:      inv.category,
      rsvpStatus:    inv.rsvpStatus,
      checkinStatus: inv.checkinStatus,
      ecardStatus,
    };
  });

  const notifRows = notifications.map(n => ({
    id:             n.id,
    channel:        n.channel,
    recipientGroup: n.recipientGroup,
    message:        n.message,
    status:         n.status,
    sentAt:         n.sentAt?.toISOString() ?? null,
    createdAt:      n.createdAt.toISOString(),
    total:          n._count.recipients,
    delivered:      n.recipients.filter(r => r.status === "delivered").length,
    failed:         n.recipients.filter(r => r.status === "failed").length,
  }));

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Reports</h1>
      <ReportsClient
        eventId={event.id}
        invitees={inviteeRows}
        hasContributions={hasContributions}
        hasExportCsv={hasExportCsv}
        hasEcards={hasEcards}
        pledgeStats={pledgeStats}
        notifications={notifRows}
      />
    </div>
  );
}
