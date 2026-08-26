import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  name:      z.string().min(1).max(200),
  eventType: z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]).nullable().optional(),
  channel:   z.enum(["sms","whatsapp","email"]),
  type:      z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","ecard","cancellation","contribution_ack"]),
  language:  z.enum(["en","sw"]).default("en"),
  subject:   z.string().max(300).nullable().optional(),
  message:   z.string().min(1),
  isActive:  z.boolean().default(true),
});

async function requireAdmin() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channel   = searchParams.get("channel")   as "sms"|"whatsapp"|"email"|null;
  const language  = searchParams.get("language")  as "en"|"sw"|null;
  const eventType = searchParams.get("eventType");
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const templates = await prisma.notificationTemplate.findMany({
    where: {
      ...(activeOnly  ? { isActive: true }              : {}),
      ...(channel     ? { channel }                     : {}),
      ...(language    ? { language }                    : {}),
      ...(eventType   ? { eventType: eventType as never } : {}),
    },
    orderBy: [{ channel: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const template = await prisma.notificationTemplate.create({ data: parsed.data as never });
  return NextResponse.json({ data: template }, { status: 201 });
}
