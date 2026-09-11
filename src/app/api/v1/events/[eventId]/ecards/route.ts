import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";
import { ecardQueue } from "@/workers/queues";

/* GET — list e-cards for the event, one row per invitee */
export async function GET(
  _req: NextRequest,
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

    const invitees = await prisma.invitee.findMany({
      where:   { eventId, deletedAt: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select:  {
        id: true, name: true, phone: true, email: true,
        seatType: true, pin: true,
        ecards: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, imagePath: true, sentAt: true },
        },
      } as any,
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, data: invitees });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/ecards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const schema = z.object({
  templateId: z.number().int().positive(),
  inviteeIds: z.array(z.number().int().positive()).optional(),
});

/* POST — queue e-card generation for selected (or all) invitees */
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

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: user.role === "admin"
        ? { id: eventId, deletedAt: null }
        : { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "ecard")) {
      return NextResponse.json({ error: "E-cards require Standard plan or above" }, { status: 403 });
    }

    const { templateId, inviteeIds } = parsed.data;

    const template = await prisma.ecardTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const invitees = await prisma.invitee.findMany({
      where: {
        eventId, deletedAt: null,
        ...(inviteeIds?.length ? { id: { in: inviteeIds } } : {}),
      },
      select: { id: true },
    });
    if (invitees.length === 0) {
      return NextResponse.json({ error: "No guests found" }, { status: 400 });
    }

    /* Persist the chosen template on the event */
    await prisma.event.update({
      where: { id: eventId },
      data:  { ecardTemplateId: templateId },
    });

    const ecards = await Promise.all(
      invitees.map(inv =>
        prisma.ecard.create({
          data: {
            eventId,
            inviteeId:   inv.id,
            organizerId: userId,
            templateId,
            status: "pending",
          },
        })
      )
    );

    await ecardQueue.addBulk(
      ecards.map(ec => ({
        name: "generate",
        data: {
          ecardId:    ec.id,
          eventId,
          inviteeId:  ec.inviteeId,
          templateId,
        },
      }))
    );

    return NextResponse.json({ success: true, data: { queued: ecards.length } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/ecards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
