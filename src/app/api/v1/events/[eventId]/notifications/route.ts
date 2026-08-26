import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";
import { notifQueue }  from "@/workers/queues";

const schema = z.object({
  type:           z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","ecard","cancellation","contribution_ack"]).default("reminder"),
  channel:        z.enum(["sms", "whatsapp", "email"]),
  recipientGroup: z.enum(["all","by_category","by_status","selected"]).default("all"),
  subject:        z.string().max(300).optional(),
  message:        z.string().min(1, "Message required").max(2000),
  language:       z.enum(["en","sw"]).default("en"),
  scheduledAt:    z.string().datetime({ offset: true }).optional(),
  dispatch:       z.boolean().default(false),
  /* filter helpers — used for invitee resolution, not persisted in notification row */
  categoryFilter: z.string().optional(),
  statusFilter:   z.enum(["rsvp_pending","rsvp_confirmed","rsvp_declined","checked_in","not_arrived"]).optional(),
  inviteeIds:     z.array(z.number()).optional(),
});

/* GET — list notifications for event */
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
      where: user.role === "admin"
        ? { id: eventId, deletedAt: null }
        : { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const notifications = await prisma.notification.findMany({
      where:   { eventId },
      include: {
        recipients: {
          select: {
            id:     true,
            status: true,
            invitee: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — create notification and optionally dispatch */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Only admins can send notifications" }, { status: 403 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    /* Tier feature checks */
    const { channel } = parsed.data;
    if (channel === "sms"      && !canAccessFeature(event.tier, "smsNotif")) {
      return NextResponse.json({ error: "SMS notifications require Standard plan or above" }, { status: 403 });
    }
    if (channel === "whatsapp" && !canAccessFeature(event.tier, "whatsappNotif")) {
      return NextResponse.json({ error: "WhatsApp notifications require Standard plan or above" }, { status: 403 });
    }

    const {
      type, recipientGroup, subject, message, language, scheduledAt,
      dispatch, categoryFilter, statusFilter, inviteeIds,
    } = parsed.data;

    const notification = await prisma.notification.create({
      data: {
        eventId,
        organizerId: event.organizerId,
        createdById: userId,
        type,
        channel,
        recipientGroup,
        subject:     subject ?? null,
        message,
        language,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status:      dispatch ? "processing" : "pending",
      },
    });

    if (dispatch) {
      const invitees = await resolveRecipients(
        eventId, recipientGroup, categoryFilter, statusFilter, inviteeIds
      );

      const eligible = invitees.filter(inv =>
        channel === "email" ? !!inv.email : !!inv.phone
      );

      if (eligible.length === 0) {
        await prisma.notification.update({
          where: { id: notification.id },
          data:  { status: "failed" },
        });
        return NextResponse.json({ error: "No eligible recipients for this channel" }, { status: 400 });
      }

      await prisma.notificationRecipient.createMany({
        data: eligible.map(inv => ({
          notificationId: notification.id,
          inviteeId:      inv.id,
          channel,
          status:         "pending" as const,
        })),
      });

      const recipients = await prisma.notificationRecipient.findMany({
        where:  { notificationId: notification.id },
        select: { id: true, inviteeId: true },
      });

      await notifQueue.addBulk(
        recipients.map(r => ({
          name: "send",
          data: {
            notificationId: notification.id,
            inviteeId:      r.inviteeId,
            channel,
            recipientId:    r.id,
          },
        }))
      );

      await prisma.notification.update({
        where: { id: notification.id },
        data:  { sentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function resolveRecipients(
  eventId:       number,
  group:         string,
  category?:     string,
  statusFilter?: string,
  inviteeIds?:   number[]
) {
  const base: Prisma.InviteeWhereInput = { eventId, deletedAt: null };
  let extra: Prisma.InviteeWhereInput = {};

  if (group === "by_category" && category) {
    extra = { category: category as Prisma.EnumInviteeCatFilter["equals"] };
  } else if (group === "by_status" && statusFilter) {
    switch (statusFilter) {
      case "rsvp_pending":    extra = { rsvpStatus: "pending" };      break;
      case "rsvp_confirmed":  extra = { rsvpStatus: "confirmed" };    break;
      case "rsvp_declined":   extra = { rsvpStatus: "declined" };     break;
      case "checked_in":      extra = { checkinStatus: "checked_in" }; break;
      case "not_arrived":     extra = { checkinStatus: "not_arrived" }; break;
    }
  } else if (group === "selected" && inviteeIds?.length) {
    extra = { id: { in: inviteeIds } };
  }

  return prisma.invitee.findMany({
    where:  { ...base, ...extra },
    select: { id: true, phone: true, email: true },
  });
}
