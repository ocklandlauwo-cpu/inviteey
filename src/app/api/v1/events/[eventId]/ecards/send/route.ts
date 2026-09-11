import { NextRequest, NextResponse } from "next/server";
import { getSession }           from "@/lib/auth";
import { prisma }               from "@/lib/prisma";
import { sendWhatsApp, sendRsvpPoll, buildInvitationMessage } from "@/lib/whatsapp";
import type { WhatsAppVendor } from "@/lib/whatsapp";

const VALID_VENDORS: WhatsAppVendor[] = ["wasender", "authkey"];

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
      where: user.role === "admin"
        ? { id: eventId, deletedAt: null }
        : { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body      = await req.json().catch(() => ({})) as { inviteeId?: number; vendor?: string };
    const inviteeId = body.inviteeId;
    if (!inviteeId) return NextResponse.json({ error: "inviteeId required" }, { status: 400 });

    /* Vendor selection is an admin-only capability — organizers always use the default. */
    const vendor: WhatsAppVendor =
      user.role === "admin" && body.vendor && VALID_VENDORS.includes(body.vendor as WhatsAppVendor)
        ? (body.vendor as WhatsAppVendor)
        : "wasender";

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

    const result = await sendWhatsApp({ to: phone, message, imageUrl: ecardUrl, vendor });

    /* Mark ecard as sent if it exists */
    if (ecard && result.success) {
      await prisma.ecard.update({
        where: { id: ecard.id },
        data:  { sentAt: new Date() },
      });
    }

    /* Follow up with a tap-to-vote RSVP poll — only meaningful over the real
     * API (a wa.me deep link can't carry a poll), only when the admin has
     * this enabled for the event, and only on WaSender (AuthKey's official
     * Business API has no native poll message type). Guests can always
     * fall back to replying YES/NO as free text regardless of this setting. */
    if (result.auto && event.rsvpPollEnabled && vendor === "wasender") {
      await sendRsvpPoll(phone, event.name);
    }

    return NextResponse.json({
      success:  result.success,
      auto:     result.auto,
      vendor,
      deepLink: result.deepLink ?? null,
    });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/ecards/send]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
