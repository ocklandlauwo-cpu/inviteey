import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { EventSettingsForm } from "./settings-form";

export default async function EventSettingsPage({ params }: { params: { eventId: string } }) {
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

  return (
    <div>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Event Settings</h1>
      <EventSettingsForm event={event} />
    </div>
  );
}
