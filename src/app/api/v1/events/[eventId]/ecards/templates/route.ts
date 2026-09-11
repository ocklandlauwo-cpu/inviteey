import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

/* GET — list active e-card templates matching the event's type */
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

    const templates = await prisma.ecardTemplate.findMany({
      where:   { eventType: event.type, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/ecards/templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
