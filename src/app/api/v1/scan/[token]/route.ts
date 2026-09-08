import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function maxSeats(seatType: string) { return seatType === "double" ? 2 : 1; }

/* POST — public QR check-in, no authentication required */
export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitee = await prisma.invitee.findFirst({
      where:   { qrToken: params.token, deletedAt: null },
      include: { event: { select: { id: true, status: true, organizerId: true } } },
    });

    if (!invitee) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    }

    const max = maxSeats(invitee.seatType);

    if (invitee.checkinCount >= max) {
      return NextResponse.json(
        {
          error: max === 2 ? "Both seats already checked in" : "Already checked in",
          data:  { name: invitee.name },
        },
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
          method:      "qr",
          checkedInAt: new Date(),
          notes:       invitee.seatType === "double" ? `Seat ${newCount} of 2` : null,
        },
      }),
    ]);

    return NextResponse.json({
      success:      true,
      data: {
        name:         invitee.name,
        seatType:     invitee.seatType,
        checkinCount: newCount,
        maxSeats:     max,
        checkinStatus: newStatus,
      },
    });
  } catch (err) {
    console.error("[POST /api/v1/scan/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* GET — return invitee info for the scan page */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitee = await prisma.invitee.findFirst({
      where:  { qrToken: params.token, deletedAt: null },
      select: {
        id: true, name: true, category: true,
        rsvpStatus: true, checkinStatus: true,
        seatType: true, checkinCount: true,
        qrToken: true,
        event: { select: { name: true, eventDate: true, venueName: true, status: true } },
      },
    });

    if (!invitee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...invitee, maxSeats: maxSeats(invitee.seatType) } });
  } catch (err) {
    console.error("[GET /api/v1/scan/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
