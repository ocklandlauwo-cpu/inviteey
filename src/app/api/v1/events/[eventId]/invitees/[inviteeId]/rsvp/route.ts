import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  rsvpStatus: z.enum(["pending", "confirmed", "declined"]),
});

/* PATCH — manually set an invitee's RSVP status */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; inviteeId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId    = parseInt(user.id, 10);
    const eventId   = parseInt(params.eventId, 10);
    const inviteeId = parseInt(params.inviteeId, 10);
    if (isNaN(eventId) || isNaN(inviteeId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const invitee = await prisma.invitee.findFirst({
      where: { id: inviteeId, eventId, organizerId: userId, deletedAt: null },
    });
    if (!invitee) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    const { rsvpStatus } = parsed.data;

    const updated = await prisma.invitee.update({
      where: { id: inviteeId },
      data:  { rsvpStatus },
    });

    await prisma.rsvpResponse.create({
      data: {
        inviteeId,
        eventId,
        response:    rsvpStatus === "confirmed" ? "yes" : rsvpStatus === "declined" ? "no" : "unknown",
        rawMessage:  "Updated manually by organizer",
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/events/:id/invitees/:invId/rsvp]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
