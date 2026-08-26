import { NextRequest, NextResponse } from "next/server";
import { getSession }           from "@/lib/auth";
import { prisma }               from "@/lib/prisma";
import { sendWhatsApp, buildInvitationMessage } from "@/lib/whatsapp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId  = parseInt(user.id, 10);
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body      = await req.json().catch(() => ({})) as { inviteeId?: number };
    const inviteeId = body.inviteeId;
    if (!inviteeId) return NextResponse.json({ error: "inviteeId required" }, { status: 400 });

    const invitee = await prisma.invitee.findFirst({
      where:   { id: inviteeId, eventId, deletedAt: null },
      include: { ecards: { where: { status: "completed" }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!invitee) return NextResponse.json({ error: "Invitee not found" }, { status: 404 });

    const phone = invitee.phone;
    if (!phone) return NextResponse.json({ error: "Invitee has no phone number" }, { status: 422 });

    const ecard    = invitee.ecards[0];
    const ecardUrl = ecard?.imagePath ? `${APP_URL}/uploads/${ecard.imagePath}` : undefined;

    const message = buildInvitationMessage({
      guestName: invitee.name,
      eventName: event.name,
      eventDate: event.eventDate,
      venue:     event.venueName,
      pin:       invitee.pin,
      ecardUrl,
    });

    const result = await sendWhatsApp({ to: phone, message, imageUrl: ecardUrl });

    /* Mark ecard as sent if it exists */
    if (ecard && result.success) {
      await prisma.ecard.update({
        where: { id: ecard.id },
        data:  { sentAt: new Date() },
      });
    }

    return NextResponse.json({
      success:  result.success,
      auto:     result.auto,
      deepLink: result.deepLink ?? null,
    });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/ecards/send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
