import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { TIER_LIMITS } from "@/types";

const schema = z.object({
  tier: z.enum(["standard", "premium", "royal"]),
});

const TIER_ORDER: Record<string, number> = {
  basic: 0, standard: 1, premium: 2, royal: 3,
};

/* POST — organizer requests a tier upgrade; admin activates after payment */
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

    const userId   = parseInt(user.id, 10);
    const { tier } = parsed.data;

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    /* Cannot downgrade */
    if (TIER_ORDER[tier] <= TIER_ORDER[event.tier]) {
      return NextResponse.json({ error: "Can only upgrade to a higher tier" }, { status: 400 });
    }

    /* If there is already a pending upgrade, block duplicate requests */
    if (!event.tierActivatedAt && event.tier !== "basic") {
      return NextResponse.json({ error: "A tier upgrade is already pending" }, { status: 409 });
    }

    await prisma.event.update({
      where: { id: eventId },
      data:  {
        tier,
        tierActivatedAt:   null,
        tierActivatedById: null,
        inviteeLimit:      TIER_LIMITS[tier].invitees,
      },
    });

    /* Audit log */
    await prisma.auditLog.create({
      data: {
        tableName: "events",
        recordId:  eventId,
        operation: "UPDATE",
        oldData:   { tier: event.tier },
        newData:   { tier, tierActivatedAt: null },
        changedBy: userId,
      },
    });

    return NextResponse.json({ success: true, message: `Upgrade to ${tier} requested` });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/tier]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
