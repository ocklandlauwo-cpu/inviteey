import { NextRequest, NextResponse } from "next/server";
import { z }         from "zod";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

async function requireAdmin() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") return null;
  return { userId: parseInt(user.id, 10) };
}

/* GET — list active staff tokens for this event */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await requireAdmin();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const staff = await prisma.eventStaff.findMany({
    where:   { eventId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select:  { id: true, accessToken: true, pin: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ data: staff });
}

const createSchema = z.object({
  hours: z.number().min(1).max(72).default(24),
});

/* POST — generate a new staff access token + 6-digit PIN */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await requireAdmin();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  const hours  = parsed.success ? parsed.data.hours : 24;

  const expiresAt    = new Date(Date.now() + hours * 60 * 60 * 1000);
  const accessToken  = uuid();
  const pin          = String(Math.floor(100000 + Math.random() * 900000));

  const staff = await prisma.eventStaff.create({
    data: { eventId, organizerId: access.userId, accessToken, pin, expiresAt },
    select: { id: true, accessToken: true, pin: true, expiresAt: true },
  });

  return NextResponse.json({ data: staff }, { status: 201 });
}

/* DELETE — revoke a staff token by id */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await requireAdmin();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.eventStaff.deleteMany({ where: { id, eventId } });
  return NextResponse.json({ success: true });
}
