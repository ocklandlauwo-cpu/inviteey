import { notFound } from "next/navigation";
import { prisma }   from "@/lib/prisma";
import { ScanClient } from "./scan-client";

export default async function ScanPage({ params }: { params: { token: string } }) {
  const invitee = await prisma.invitee.findFirst({
    where:   { qrToken: params.token, deletedAt: null },
    include: {
      event: {
        select: {
          id:        true,
          name:      true,
          eventDate: true,
          venueName: true,
          status:    true,
        },
      },
    },
  });

  if (!invitee) notFound();

  return (
    <ScanClient
      invitee={{
        id:            invitee.id,
        name:          invitee.name,
        phone:         invitee.phone,
        category:      invitee.category,
        seatType:      invitee.seatType,
        checkinCount:  invitee.checkinCount,
        rsvpStatus:    invitee.rsvpStatus,
        checkinStatus: invitee.checkinStatus,
        qrToken:       invitee.qrToken,
      }}
      event={{
        id:        invitee.event.id,
        name:      invitee.event.name,
        eventDate: invitee.event.eventDate.toISOString(),
        venueName: invitee.event.venueName,
        status:    invitee.event.status,
      }}
    />
  );
}
