import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function maxSeats(seatType: string) { return seatType === "double" ? 2 : 1; }

/**
 * POST /api/v1/scan/pin
 * Body: { pin: "123456", eventId: 123 }
 * Used by staff to check in a guest who doesn't have a smartphone for QR scanning.
 */
export async function POST(req: NextRequest) {
  try {
    const body    = await req.json().catch(() => ({})) as Record<string, unknown>;
    const pin     = typeof body.pin     === "string" ? body.pin.trim()     : "";
    const eventId = typeof body.eventId === "number" ? body.eventId        : NaN;

    if (!pin || pin.length !== 6 || isNaN(eventId)) {
      return NextResponse.json({ error: "pin (6 digits) and eventId are required" }, { status: 400 });
    }

    const invitee = await prisma.invitee.findFirst({
      where:   { pin, eventId, deletedAt: null },
      include: { event: { select: { id: true, status: true, organizerId: true, name: true } } },
    });

    if (!invitee) {
      return NextResponse.json({ error: "PIN not found for this event" }, { status: 404 });
    }

    const max = maxSeats(invitee.seatType);

    if (invitee.checkinCount >= max) {
      return NextResponse.json(
        { error: max === 2 ? "Both seats already checked in" : "Already checked in" },
        { status: 409 }
      );
    }

    const newCount  = invitee.checkinCount + 1;
    const newStatus = newCount >= max ? "checked_in" : invitee.checkinStatus;

    await prisma.$transaction([
      prisma.invitee.update({
        where: { id: invitee.id },
        data:  { checkinCount: newCount, checkinStatus: newStatus },
      }),
      prisma.checkin.create({
        data: {
          eventId:     invitee.event.id,
          inviteeId:   invitee.id,
          organizerId: invitee.event.organizerId,
          method:      "manual",
          checkedInAt: new Date(),
          notes:       invitee.seatType === "double" ? `Seat ${newCount} of 2 (PIN)` : "(PIN)",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        name:          invitee.name,
        eventName:     invitee.event.name,
        seatType:      invitee.seatType,
        checkinCount:  newCount,
        maxSeats:      max,
        checkinStatus: newStatus,
      },
    });
  } catch (err) {
    console.error("[POST /api/v1/scan/pin]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
