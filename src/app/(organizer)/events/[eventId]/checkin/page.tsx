import { notFound, redirect } from "next/navigation";
import { getSession }         from "@/lib/auth";
import { prisma }             from "@/lib/prisma";
import { CheckinDashboard }   from "@/components/checkin/checkin-dashboard";

export default async function CheckinPage({ params }: { params: { eventId: string } }) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId  = parseInt(user.id, 10);
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) notFound();

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Check-in</h1>
      <CheckinDashboard eventId={event.id} readOnly embedded />
    </div>
  );
}
