import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const createSchema = z.object({
  name:         z.string().min(3).max(200),
  type:         z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]),
  eventDate:    z.string().datetime({ offset: true }).or(z.string().min(1)),
  venueName:    z.string().min(2).max(300),
  venueAddress: z.string().optional(),
  description:  z.string().optional(),
  language:     z.enum(["en","sw"]).default("en"),
  currencyCode: z.string().min(3).max(3).default("TZS"),
});

/* GET — list organizer's events */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(user.id, 10);
    const events = await prisma.event.findMany({
      where:   { organizerId: userId, deletedAt: null },
      include: { _count: { select: { invitees: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    console.error("[GET /api/v1/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — create new event */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const { name, type, eventDate, venueName, venueAddress, description, language, currencyCode } = parsed.data;

    const event = await prisma.event.create({
      data: {
        organizerId:  userId,
        name,
        type,
        eventDate:    new Date(eventDate),
        venueName,
        venueAddress: venueAddress ?? null,
        description:  description  ?? null,
        language,
        currencyCode,
        tier:         "basic",
        inviteeLimit: 5,
        status:       "draft",
      },
    });

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
