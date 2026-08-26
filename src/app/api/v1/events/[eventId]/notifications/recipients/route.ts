import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import type { PledgeStatus } from "@prisma/client";

function aggregateContributionStatus(pledges: { status: PledgeStatus }[]): PledgeStatus {
  if (pledges.length === 0) return "unpaid";
  if (pledges.every(p => p.status === "fully_paid")) return "fully_paid";
  if (pledges.every(p => p.status === "unpaid")) return "unpaid";
  return "partially_paid";
}

/* GET — preview invitees matching a contribution-status filter */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const statusParam = req.nextUrl.searchParams.get("contributionStatus") ?? "";
    const statuses = statusParam.split(",").filter(Boolean) as PledgeStatus[];
    if (statuses.length === 0) return NextResponse.json({ success: true, data: [] });

    const invitees = await prisma.invitee.findMany({
      where:  { eventId, deletedAt: null },
      select: {
        id:      true,
        name:    true,
        phone:   true,
        pledges: { where: { deletedAt: null }, select: { status: true } },
      },
      orderBy: { id: "asc" },
    });

    const matching = invitees
      .filter(inv => statuses.includes(aggregateContributionStatus(inv.pledges)))
      .map(({ id, name, phone }) => ({ id, name, phone }));

    return NextResponse.json({ success: true, data: matching });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/notifications/recipients]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
