import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  name:      z.string().min(1).max(200).optional(),
  eventType: z.enum(["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"]).nullable().optional(),
  channel:   z.enum(["sms","whatsapp","email"]).optional(),
  type:      z.enum(["invitation","reminder","rsvp_followup","contribution_reminder","ecard","cancellation","contribution_ack"]).optional(),
  language:  z.enum(["en","sw"]).optional(),
  subject:   z.string().max(300).nullable().optional(),
  message:   z.string().min(1).optional(),
  isActive:  z.boolean().optional(),
});

async function requireAdmin() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.templateId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const template = await prisma.notificationTemplate.update({ where: { id }, data: parsed.data as never });
  return NextResponse.json({ data: template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.templateId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const existing = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  await prisma.notificationTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
