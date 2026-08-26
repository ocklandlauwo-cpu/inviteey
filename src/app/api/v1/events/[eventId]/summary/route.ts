import { NextRequest, NextResponse } from "next/server";
import { getSession }              from "@/lib/auth";
import { prisma }                  from "@/lib/prisma";
import { generatePostEventSummary } from "@/lib/gemini";

export async function POST(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId  = parseInt(user.id, 10);
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    /* Allow organizer who owns the event OR admin */
    const whereClause = user.role === "admin"
      ? { id: eventId, deletedAt: null }
      : { id: eventId, organizerId: userId, deletedAt: null };

    const event = await prisma.event.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            invitees: { where: { deletedAt: null } },
            checkins: true,
          },
        },
      },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.status !== "completed") {
      return NextResponse.json({ error: "Summary only available for completed events" }, { status: 422 });
    }

    const rsvpCounts = await prisma.invitee.groupBy({
      by:    ["rsvpStatus"],
      where: { eventId, deletedAt: null },
      _count: { rsvpStatus: true },
    });
    const rsvpConfirmed = rsvpCounts.find(r => r.rsvpStatus === "confirmed")?._count.rsvpStatus ?? 0;

    const pledgeAgg  = await prisma.pledge.aggregate({ where: { eventId, deletedAt: null }, _sum: { amount: true } });
    const paymentAgg = await prisma.payment.aggregate({ where: { eventId, deletedAt: null }, _sum: { amount: true } });

    const fmt = (n: bigint | null) => n ? Number(n).toLocaleString("en") : "0";

    const summary = await generatePostEventSummary({
      eventName:      event.name,
      eventType:      event.type,
      totalInvitees:  event._count.invitees,
      rsvpConfirmed,
      attendees:      event._count.checkins,
      totalPledged:   fmt(pledgeAgg._sum.amount  ?? BigInt(0)),
      totalCollected: fmt(paymentAgg._sum.amount ?? BigInt(0)),
      currencyCode:   event.currencyCode,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/summary]", err);
    return NextResponse.json({ error: "Failed to generate summary. Please try again." }, { status: 500 });
  }
}
