import { NextRequest, NextResponse } from "next/server";
import { prisma }               from "@/lib/prisma";
import { verifyWasenderWebhook, parseRsvpReply } from "@/lib/whatsapp";

interface WasenderMessageKey {
  id?:                  string;
  fromMe?:              boolean;
  remoteJid?:           string;
  cleanedSenderPn?:     string;
  cleanedParticipantPn?: string;
}

/* Numeric status codes per WaSender's messages.update webhook */
const STATUS_CODE: Record<number, "sent" | "delivered" | "failed" | null> = {
  0: "failed",
  1: null,       // pending — nothing to record yet
  2: "sent",
  3: "delivered",
  4: "delivered", // read
  5: "delivered", // played
};

export async function POST(req: NextRequest) {
  try {
    const rawBody   = await req.text();
    const signature = req.headers.get("x-webhook-signature");

    if (!verifyWasenderWebhook(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        messages?: { key?: WasenderMessageKey; messageBody?: string };
        key?:      WasenderMessageKey;
        update?:   { status?: number };
      };
    };

    /* ── Inbound message → RSVP ─────────────────────────── */
    if (payload.event === "messages.upsert" || payload.event === "messages.received") {
      const msg = payload.data?.messages;
      const key = msg?.key;

      if (!msg || !key || key.fromMe) return NextResponse.json({ ok: true });

      /* Per WaSender's docs, remoteJid can be a LID rather than a phone number —
       * cleanedSenderPn/cleanedParticipantPn are the actual phone numbers. */
      const from = (key.cleanedSenderPn ?? key.cleanedParticipantPn)?.trim();
      const message = (msg.messageBody ?? "").trim();

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
    if (payload.event === "messages.update") {
      const messageId = payload.data?.key?.id;
      const statusRaw = payload.data?.update?.status;

      if (!messageId || statusRaw === undefined) return NextResponse.json({ ok: true });

      const deliveryStatus = STATUS_CODE[statusRaw] ?? null;
      if (!deliveryStatus) return NextResponse.json({ ok: true });

      /* NOTE: WaSender's per-message status webhook has no counterpart to match
       * against here — NotificationRecipient doesn't currently store the
       * provider's message ID, so this can't be scoped to the specific
       * recipient this event is about. Left as a known limitation. */
      await prisma.notificationRecipient.updateMany({
        where: { channel: "whatsapp", status: { in: ["pending", "sent"] } },
        data:  {
          status:      deliveryStatus,
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
