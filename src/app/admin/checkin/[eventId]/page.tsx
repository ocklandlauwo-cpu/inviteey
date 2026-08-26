import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { CheckinDashboard } from "@/components/checkin/checkin-dashboard";
import { StaffLinksPanel }  from "@/components/checkin/staff-links-panel";

export default async function AdminCheckinPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user || user.role !== "admin") notFound();

  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where:  { id: eventId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!event) notFound();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/events"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Events
        </Link>
        <span className="text-gray-300">·</span>
        <p className="text-sm text-gray-600 font-medium">{event.name}</p>
      </div>

      <StaffLinksPanel eventId={event.id} />
      <CheckinDashboard eventId={event.id} embedded />
    </div>
  );
}
