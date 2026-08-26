import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";

/* GET — export guest list with RSVP/check-in status as CSV (Premium+ tier) */
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
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "exportCsv")) {
      return NextResponse.json({ error: "CSV export requires Premium plan or above" }, { status: 403 });
    }

    const invitees = await prisma.invitee.findMany({
      where:   { eventId, deletedAt: null },
      select:  { name: true, phone: true, email: true, category: true, rsvpStatus: true, checkinStatus: true },
      orderBy: { name: "asc" },
    });

    const header = ["Name", "Phone", "Email", "Category", "RSVP Status", "Check-in Status"];
    const rows = invitees.map(inv => [
      inv.name, inv.phone ?? "", inv.email ?? "", inv.category, inv.rsvpStatus, inv.checkinStatus,
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="guest-report-${eventId}.csv"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/reports/export]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
