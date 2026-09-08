import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { AdminEventsTable } from "@/components/admin/admin-events-table";

export default async function AdminEventsPage() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const events = await prisma.event.findMany({
    where:   { deletedAt: null },
    orderBy: { id: "asc" },
    select: {
      id:                       true,
      name:                     true,
      type:                     true,
      status:                   true,
      tier:                     true,
      eventDate:                true,
      createdAt:                true,
      ecardAddonActive:         true,
      notificationsAddonActive: true,
      rsvpPollEnabled:          true,
      organizer: { select: { id: true, name: true, email: true } },
      _count:    { select: { invitees: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Events</h1>
        <p className="text-gray-500 text-sm mt-1">{events.length} events across all organizers</p>
      </div>

      <AdminEventsTable events={events} />
    </div>
  );
}
