import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* Kenosis sends a bearer token in Authorization header for webhook auth */
function verifyKenosis(req: NextRequest): boolean {
  const secret = process.env.KENOSIS_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured → accept all (dev)
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}` || auth === secret;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyKenosis(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload   = await req.json().catch(() => ({}));
    const phone     = (payload.recipient ?? payload.to ?? payload.phone ?? "") as string;
    const statusRaw = (payload.status ?? payload.delivery_status ?? "") as string;

    if (!phone || !statusRaw) return NextResponse.json({ ok: true });

    const deliveryStatus =
      statusRaw.toLowerCase() === "delivered" ? "delivered" :
      statusRaw.toLowerCase() === "sent"      ? "sent"      :
      statusRaw.toLowerCase() === "failed"    ? "failed"    : null;

    if (!deliveryStatus) return NextResponse.json({ ok: true });

    /* Find latest pending/sent SMS recipient with this phone */
    const invitee = await prisma.invitee.findFirst({
      where: {
        OR: [{ phone }, { phone: phone.startsWith("+") ? phone.slice(1) : `+${phone}` }],
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!invitee) return NextResponse.json({ ok: true });

    await prisma.notificationRecipient.updateMany({
      where: {
        inviteeId: invitee.id,
        channel:   "sms",
        status:    { in: ["pending", "sent"] },
      },
      data: {
        status:      deliveryStatus as "sent" | "delivered" | "failed",
        deliveredAt: deliveryStatus === "delivered" ? new Date() : undefined,
      },
    });

    console.log(`[kenosis-webhook] SMS ${deliveryStatus} for ${phone}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/webhooks/kenosis]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
