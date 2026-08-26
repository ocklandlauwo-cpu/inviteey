import { prisma }  from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect }   from "next/navigation";
import { TierActivationTable } from "@/components/admin/tier-activation-table";

export default async function AdminTiersPage() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const events = await prisma.event.findMany({
    where: {
      tier: { not: "basic" },
      tierActivatedAt: null,
      deletedAt: null,
    },
    include: { organizer: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { id: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Tier Activation Requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Events that have been upgraded but not yet payment-confirmed. Activate after receiving payment.
        </p>
      </div>

      <TierActivationTable events={events} adminId={parseInt(user.id, 10)} />
    </div>
  );
}
