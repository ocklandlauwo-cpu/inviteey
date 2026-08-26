import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  tier:   z.enum(["basic", "standard", "premium", "royal"]).optional(),
  status: z.enum(["draft", "active", "event_day", "completed", "cancelled"]).optional(),
});

const TIER_INVITEE_LIMIT: Record<string, number> = {
  basic:    5,
  standard: 251,
  premium:  551,
  royal:    1001,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    if (!parsed.data.tier && !parsed.data.status) {
      return NextResponse.json({ error: "tier or status required" }, { status: 400 });
    }

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { tier, status } = parsed.data;
    const adminId = parseInt(user.id, 10);

    const updateData: Record<string, unknown> = {};
    const oldData:    Record<string, unknown> = {};
    const newData:    Record<string, unknown> = {};

    if (tier && tier !== event.tier) {
      updateData.tier         = tier;
      updateData.inviteeLimit = TIER_INVITEE_LIMIT[tier];
      oldData.tier = event.tier; newData.tier = tier;
    }
    if (status && status !== event.status) {
      updateData.status = status;
      oldData.status = event.status; newData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: event });
    }

    const updated = await prisma.event.update({ where: { id: eventId }, data: updateData });

    await prisma.auditLog.create({
      data: { tableName: "events", recordId: eventId, operation: "UPDATE", oldData: oldData as any, newData: newData as any, changedBy: adminId },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/events/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
