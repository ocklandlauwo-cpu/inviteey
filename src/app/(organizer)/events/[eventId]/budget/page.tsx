import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";
import { BudgetClient } from "@/components/budget/budget-client";
import { TierUpgradeBanner } from "@/components/events/tier-upgrade-banner";

export default async function BudgetPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  const hasBudget = canAccessFeature(event.tier, "budget");

  if (!hasBudget) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Budget</h1>
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

  const [budget, vendors] = await Promise.all([
    prisma.eventBudget.findUnique({ where: { eventId } }),
    prisma.vendor.findMany({ where: { eventId }, orderBy: { id: "asc" } }),
  ]);

  return (
    <BudgetClient
      eventId={event.id}
      budget={budget ? { ...budget, totalBudget: budget.totalBudget?.toString() ?? null } : null}
      vendors={vendors.map(v => ({
        ...v,
        estimatedCost: v.estimatedCost?.toString() ?? null,
        agreedCost:    v.agreedCost?.toString() ?? null,
      }))}
    />
  );
}
