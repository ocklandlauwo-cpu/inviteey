import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const patchSchema = z.object({
  name:         z.string().min(3).max(200).optional(),
  type:         z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]).optional(),
  eventDate:    z.string().min(1).optional(),
  venueName:    z.string().min(2).max(300).optional(),
  venueAddress: z.string().optional(),
  description:  z.string().optional(),
  language:     z.enum(["en","sw"]).optional(),
  status:       z.enum(["draft","active","event_day","completed","cancelled"]).optional(),
  currencyCode: z.string().min(3).max(3).optional(),
  ecardTemplateId: z.number().int().positive().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { eventDate, ...rest } = parsed.data;
    const updated = await prisma.event.update({
      where: { id: eventId },
      data:  {
        ...rest,
        ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/events/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    await prisma.event.update({
      where: { id: eventId },
      data:  { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/events/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
