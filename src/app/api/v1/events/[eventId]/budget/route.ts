import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";

const schema = z.object({
  totalBudget: z.number().int().nonnegative().nullable().optional(),
  notes:       z.string().optional(),
});

/* GET — fetch event budget */
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

    if (!canAccessFeature(event.tier, "budget")) {
      return NextResponse.json({ error: "Budget tracking requires Premium plan or above" }, { status: 403 });
    }

    const budget = await prisma.eventBudget.findUnique({ where: { eventId } });

    return NextResponse.json({
      success: true,
      data: budget ? { ...budget, totalBudget: budget.totalBudget?.toString() ?? null } : null,
    });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/budget]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* PATCH — create or update event budget */
export async function PATCH(
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

    if (!canAccessFeature(event.tier, "budget")) {
      return NextResponse.json({ error: "Budget tracking requires Premium plan or above" }, { status: 403 });
    }

    const { totalBudget, notes } = parsed.data;

    const budget = await prisma.eventBudget.upsert({
      where:  { eventId },
      create: {
        eventId,
        organizerId: userId,
        totalBudget: totalBudget != null ? BigInt(totalBudget) : null,
        notes:       notes ?? null,
      },
      update: {
        ...(totalBudget !== undefined && { totalBudget: totalBudget != null ? BigInt(totalBudget) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({
      success: true,
      data:    { ...budget, totalBudget: budget.totalBudget?.toString() ?? null },
    });
  } catch (err) {
    console.error("[PATCH /api/v1/events/:id/budget]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
