import { NextRequest, NextResponse } from "next/server";
import { z }               from "zod";
import { getSession }      from "@/lib/auth";
import { prisma }          from "@/lib/prisma";
import { suggestNotificationMessage } from "@/lib/gemini";

const schema = z.object({
  type:     z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","cancellation"]),
  channel:  z.enum(["sms","whatsapp","email"]),
  language: z.enum(["en","sw"]).default("en"),
});

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
      where:  { id: eventId, deletedAt: null },
      select: { name: true, type: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { type, channel, language } = parsed.data;

    /* Build a richer prompt context from channel */
    const channelHint = channel === "sms"
      ? "Keep it under 160 characters (SMS)."
      : channel === "whatsapp"
        ? "WhatsApp format — can be a bit longer, use *bold* for emphasis. Under 300 characters."
        : "Email body — can be 2-3 sentences, warm and professional.";

    const message = await suggestNotificationMessage(
      event.name,
      event.type,
      `${type} (${channelHint})`,
      language,
    );

    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/notifications/suggest]", err);
    return NextResponse.json({ error: "AI suggestion failed. Please try again." }, { status: 500 });
  }
}
