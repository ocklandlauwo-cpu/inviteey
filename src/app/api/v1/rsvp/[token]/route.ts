import { NextRequest, NextResponse } from "next/server";
import { z }      from "zod";
import { prisma } from "@/lib/prisma";

/* GET — return invitee + event info for the public RSVP page */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitee = await prisma.invitee.findFirst({
      where:   { qrToken: params.token, deletedAt: null },
      select: {
        id:         true,
        name:       true,
        rsvpStatus: true,
        event: {
          select: {
            id:        true,
            name:      true,
            eventDate: true,
            venueName: true,
            type:      true,
          },
        },
      },
    });

    if (!invitee) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    return NextResponse.json({ data: invitee });
  } catch (err) {
    console.error("[GET /api/v1/rsvp/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const schema = z.object({
  response: z.enum(["confirmed", "declined"]),
});

/* POST — submit RSVP (public, no auth required) */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body   = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "response must be confirmed or declined" }, { status: 400 });
    }

    const invitee = await prisma.invitee.findFirst({
      where: { qrToken: params.token, deletedAt: null },
    });
    if (!invitee) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    const rsvpStatus = parsed.data.response;

    await prisma.invitee.update({
      where: { id: invitee.id },
      data:  { rsvpStatus },
    });

    await prisma.rsvpResponse.create({
      data: {
        inviteeId:   invitee.id,
        eventId:     invitee.eventId,
        response:    rsvpStatus === "confirmed" ? "yes" : "no",
        rawMessage:  `Web RSVP: ${rsvpStatus}`,
        sourcePhone: invitee.phone ?? "web",
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: { rsvpStatus } });
  } catch (err) {
    console.error("[POST /api/v1/rsvp/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
