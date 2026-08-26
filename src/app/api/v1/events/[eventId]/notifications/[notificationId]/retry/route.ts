import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { notifQueue } from "@/workers/queues";

const schema = z.object({
  recipientIds: z.array(z.number()).optional(),
});

/* POST — retry failed recipients for a notification (individually or in bulk) */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; notificationId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId        = parseInt(params.eventId, 10);
    const notificationId = parseInt(params.notificationId, 10);
    if (isNaN(eventId) || isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: user.role === "admin"
        ? { id: eventId, deletedAt: null }
        : { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, eventId },
    });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { recipientIds } = parsed.data;

    const failedRecipients = await prisma.notificationRecipient.findMany({
      where: {
        notificationId,
        status: "failed",
        ...(recipientIds?.length ? { id: { in: recipientIds } } : {}),
      },
      select: { id: true, inviteeId: true },
    });

    if (failedRecipients.length === 0) {
      return NextResponse.json({ error: "No failed recipients to retry" }, { status: 400 });
    }

    await prisma.notificationRecipient.updateMany({
      where: { id: { in: failedRecipients.map(r => r.id) } },
      data:  { status: "pending", errorMessage: null, sentAt: null, deliveredAt: null },
    });

    await prisma.notification.update({
      where: { id: notificationId },
      data:  { status: "processing" },
    });

    await notifQueue.addBulk(
      failedRecipients.map(r => ({
        name: "send",
        data: {
          notificationId,
          inviteeId:   r.inviteeId,
          channel:     notification.channel,
          recipientId: r.id,
        },
      }))
    );

    return NextResponse.json({ success: true, retried: failedRecipients.length });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/notifications/:id/retry]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
