import { prisma } from "@/lib/prisma";
import { AdminNotificationsTable } from "@/components/admin/admin-notifications-table";

export default async function AdminNotificationsPage() {
  const events = await prisma.event.findMany({
    where:   { deletedAt: null },
    orderBy: { id: "asc" },
    select: {
      id:   true,
      name: true,
      tier: true,
      organizer: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          Compose and send guest notifications on behalf of organizers.
        </p>
      </div>

      <AdminNotificationsTable events={events} />
    </div>
  );
}
