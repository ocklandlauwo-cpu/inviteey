import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";

const schema = z.object({
  inviteeId: z.number().int().positive(),
  type:      z.enum(["fixed", "flexible"]).default("fixed"),
  amount:    z.number().int().positive(),
  notes:     z.string().optional(),
});

/* GET — list pledges for event */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "contributions")) {
      return NextResponse.json({ error: "Contributions require Standard plan or above" }, { status: 403 });
    }

    const pledges = await prisma.pledge.findMany({
      where:   { eventId, deletedAt: null },
      include: {
        invitee:  { select: { id: true, name: true, phone: true } },
        payments: { where: { deletedAt: null }, select: { id: true, amount: true, paidAt: true, notes: true } },
      },
      orderBy: { id: "asc" },
    });

    /* Serialize BigInt to string for JSON */
    const data = pledges.map(p => ({
      ...p,
      amount:   p.amount.toString(),
      payments: p.payments.map(pay => ({
        ...pay,
        amount: pay.amount.toString(),
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/pledges]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — create pledge */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "contributions")) {
      return NextResponse.json({ error: "Contributions require Standard plan or above" }, { status: 403 });
    }

    const { inviteeId, type, amount, notes } = parsed.data;

    /* Verify invitee belongs to this event */
    const invitee = await prisma.invitee.findFirst({
      where: { id: inviteeId, eventId, deletedAt: null },
    });
    if (!invitee) return NextResponse.json({ error: "Invitee not found" }, { status: 404 });

    const pledge = await prisma.pledge.create({
      data: {
        eventId,
        inviteeId,
        organizerId: userId,
        type,
        amount:      BigInt(amount),
        notes:       notes ?? null,
      },
    });

    /* Mark invitee as having contribution flag */
    await prisma.invitee.update({
      where: { id: inviteeId },
      data:  { contributionFlag: true },
    });

    return NextResponse.json({
      success: true,
      data:    { ...pledge, amount: pledge.amount.toString() },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/pledges]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
