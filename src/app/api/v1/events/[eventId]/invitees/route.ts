import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";
import { getInviteeLimitWarning, getInviteeLimit } from "@/lib/tier-access";

const createSchema = z.object({
  name:     z.string().min(2).max(200),
  phone:    z.string().optional(),
  email:    z.string().email().optional(),
  category: z.enum(["family","friends","colleagues","vip","other"]).default("other"),
  seatType: z.enum(["single","double"]).default("single"),
});

async function generateUniquePin(eventId: number): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await prisma.invitee.findFirst({ where: { pin, eventId, deletedAt: null } });
    if (!existing) return pin;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getEventForOrganizer(eventId: number, userId: number, isAdmin: boolean) {
  return prisma.event.findFirst({
    where: isAdmin
      ? { id: eventId, deletedAt: null }
      : { id: eventId, organizerId: userId, deletedAt: null },
  });
}

/* GET — list invitees */
export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId  = parseInt(user.id, 10);
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

    const event = await getEventForOrganizer(eventId, userId, user.role === "admin");
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const invitees = await prisma.invitee.findMany({
      where:   { eventId, deletedAt: null },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, data: invitees });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/invitees]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — add invitee */
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId  = parseInt(user.id, 10);
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

    const event = await getEventForOrganizer(eventId, userId, user.role === "admin");
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    /* Enforce tier limit */
    const currentCount = await prisma.invitee.count({ where: { eventId, deletedAt: null } });
    const limit        = getInviteeLimit(event.tier);
    const limitStatus  = getInviteeLimitWarning(currentCount, limit);

    if (limitStatus === "at_limit" || limitStatus === "over_limit") {
      return NextResponse.json(
        { error: `Guest limit reached (${limit}). Upgrade your plan to add more guests.` },
        { status: 422 }
      );
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, phone, email, category, seatType } = parsed.data;

    const invitee = await prisma.invitee.create({
      data: {
        eventId,
        organizerId: userId,
        name,
        phone:    phone ?? null,
        email:    email ?? null,
        category,
        seatType,
        pin: await generateUniquePin(eventId),
      },
    });

    return NextResponse.json({ success: true, data: invitee }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/invitees]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
