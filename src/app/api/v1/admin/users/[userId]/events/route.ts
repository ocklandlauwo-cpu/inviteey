import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const events = await prisma.event.findMany({
      where:   { organizerId: userId, deletedAt: null },
      select:  { id: true, name: true, type: true, tier: true, status: true, eventDate: true },
      orderBy: { eventDate: "desc" },
    });

    return NextResponse.json({ success: true, data: events });
  } catch (err) {
    console.error("[GET /api/v1/admin/users/:id/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
