import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { sendEmail, buildTierActivationEmail } from "@/lib/email";
import { TIER_LABELS } from "@/types";

export async function POST(
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

    const event = await prisma.event.findFirst({
      where:   { id: eventId, deletedAt: null },
      include: { organizer: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (event.tierActivatedAt) {
      return NextResponse.json({ error: "Tier already activated" }, { status: 409 });
    }

    const adminId = parseInt(user.id, 10);
    const limit   = { basic: 5, standard: 251, premium: 551, royal: 1001 }[event.tier];

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        tierActivatedAt:  new Date(),
        tierActivatedById: adminId,
        inviteeLimit:     limit,
        status:           "active",
      },
    });

    /* Audit log */
    await prisma.auditLog.create({
      data: {
        tableName: "events",
        recordId:  eventId,
        operation: "UPDATE",
        oldData:   { tier: event.tier, tierActivatedAt: null },
        newData:   { tier: updated.tier, tierActivatedAt: updated.tierActivatedAt },
        changedBy: adminId,
      },
    });

    /* Notify organizer */
    try {
      const html = buildTierActivationEmail(
        event.organizer.name,
        event.name,
        TIER_LABELS[event.tier]
      );
      await sendEmail({
        to:      event.organizer.email,
        subject: `Your ${TIER_LABELS[event.tier]} plan is now active!`,
        html,
      });
    } catch (e) {
      console.error("[activate-tier] email failed:", e);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[POST /api/v1/admin/events/:id/activate-tier]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
