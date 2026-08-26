import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const patchSchema = z.object({
  name:     z.string().min(2).max(200).optional(),
  phone:    z.string().nullable().optional(),
  email:    z.string().email().nullable().optional().or(z.literal("")),
  category: z.enum(["family","friends","colleagues","vip","other"]).optional(),
  seatType: z.enum(["single","double"]).optional(),
});

/* PATCH — edit invitee details */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; inviteeId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId    = parseInt(user.id, 10);
    const eventId   = parseInt(params.eventId, 10);
    const inviteeId = parseInt(params.inviteeId, 10);

    if (isNaN(eventId) || isNaN(inviteeId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const invitee = await prisma.invitee.findFirst({
      where: { id: inviteeId, eventId, organizerId: userId, deletedAt: null },
    });
    if (!invitee) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, phone, email, category, seatType } = parsed.data;

    const updated = await prisma.invitee.update({
      where: { id: inviteeId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...(name     !== undefined ? { name } : {}),
        ...(phone    !== undefined ? { phone: phone || null } : {}),
        ...(email    !== undefined ? { email: email || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(seatType !== undefined ? { seatType } as any : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/events/:id/invitees/:invId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* DELETE — soft-delete an invitee */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string; inviteeId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId    = parseInt(user.id, 10);
    const eventId   = parseInt(params.eventId, 10);
    const inviteeId = parseInt(params.inviteeId, 10);

    if (isNaN(eventId) || isNaN(inviteeId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    /* Verify ownership */
    const invitee = await prisma.invitee.findFirst({
      where: { id: inviteeId, eventId, organizerId: userId, deletedAt: null },
    });
    if (!invitee) return NextResponse.json({ error: "Guest not found" }, { status: 404 });

    await prisma.invitee.update({
      where: { id: inviteeId },
      data:  { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/events/:id/invitees/:invId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
