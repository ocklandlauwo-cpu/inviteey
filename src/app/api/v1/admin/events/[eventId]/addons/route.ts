import { NextRequest, NextResponse } from "next/server";
import { z }          from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  ecardAddonActive:         z.boolean().optional(),
  notificationsAddonActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const updated = await prisma.event.update({
      where: { id: eventId },
      data:  parsed.data,
      select: {
        id: true,
        ecardAddonActive:         true,
        notificationsAddonActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName:  "events",
        recordId:   eventId,
        operation:  "UPDATE",
        oldData:    {
          ecardAddonActive:         event.ecardAddonActive,
          notificationsAddonActive: event.notificationsAddonActive,
        },
        newData:    parsed.data,
        changedBy: parseInt(user.id, 10),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/events/:id/addons]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
