import { NextRequest, NextResponse } from "next/server";
import { prisma }               from "@/lib/prisma";
import { verifyWasenderWebhook, parseRsvpReply } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const rawBody  = await req.text();
    const signature = req.headers.get("x-wasender-signature");

    if (!verifyWasenderWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const type    = payload.type as string | undefined;

    /* ── Inbound message → RSVP ─────────────────────────── */
    if (type === "message_received") {
      const from    = (payload.from    as string | undefined)?.trim();
      const message = (payload.message as string | undefined)?.trim() ?? "";

      if (!from) return NextResponse.json({ ok: true });

      const rsvpAnswer = parseRsvpReply(message);
      if (rsvpAnswer === "unknown") return NextResponse.json({ ok: true });

      /* Find invitee by phone — try with and without leading + */
      const normalized = from.startsWith("+") ? from : `+${from}`;
      const invitee = await prisma.invitee.findFirst({
        where: {
          OR: [{ phone: from }, { phone: normalized }],
          deletedAt: null,
        },
        include: { event: { select: { id: true } } },
      });

      if (!invitee) return NextResponse.json({ ok: true });

      const rsvpStatus = rsvpAnswer === "yes" ? "confirmed" : "declined";

      await prisma.invitee.update({
        where: { id: invitee.id },
        data:  { rsvpStatus },
      });

      await prisma.rsvpResponse.create({
        data: {
          inviteeId:   invitee.id,
          eventId:     invitee.event.id,
          response:    rsvpAnswer === "yes" ? "yes" : "no",
          rawMessage:  message,
          sourcePhone: from,
          respondedAt: new Date(),
        },
      });

      console.log(`[wasender-webhook] RSVP ${rsvpStatus} from ${from} — invitee ${invitee.id}`);
    }

    /* ── Message status update → delivery tracking ───────── */
    if (type === "message_status") {
      const messageId   = payload.message_id as string | undefined;
      const statusRaw   = (payload.status    as string | undefined)?.toLowerCase();

      if (!messageId || !statusRaw) return NextResponse.json({ ok: true });

      const deliveryStatus =
        statusRaw === "delivered" ? "delivered" :
        statusRaw === "read"      ? "delivered" :
        statusRaw === "sent"      ? "sent"      :
        statusRaw === "failed"    ? "failed"    : null;

      if (!deliveryStatus) return NextResponse.json({ ok: true });

      await prisma.notificationRecipient.updateMany({
        where: { status: { in: ["pending", "sent"] } },
        data:  {
          status:      deliveryStatus as "sent" | "delivered" | "failed",
          deliveredAt: deliveryStatus === "delivered" ? new Date() : undefined,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/webhooks/wasender]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
