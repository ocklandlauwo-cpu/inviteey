import { NextRequest, NextResponse } from "next/server";
import { z }       from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const postSchema = z.object({
  inviteeId: z.number({ required_error: "inviteeId required" }),
  method:    z.enum(["qr", "manual"]).default("manual"),
});

async function resolveAccess(req: NextRequest, eventId: number) {
  const { user } = await getSession();
  if (user) {
    if (user.role === "admin") return { userId: parseInt(user.id, 10), organizerId: null };
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: parseInt(user.id, 10), deletedAt: null },
    });
    if (event) return { userId: parseInt(user.id, 10), organizerId: event.organizerId };
  }

  /* Staff token fallback */
  const staffToken = req.headers.get("x-staff-token");
  const staffPin   = req.headers.get("x-staff-pin");
  if (staffToken && staffPin) {
    const staff = await prisma.eventStaff.findFirst({
      where: { accessToken: staffToken, eventId, expiresAt: { gt: new Date() } },
    });
    if (staff && staff.pin === staffPin) return { userId: staff.organizerId, organizerId: staff.organizerId };
  }

  return null;
}

/* GET — attendance summary + paginated invitee list */
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await resolveAccess(req, eventId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.toLowerCase() ?? "";
  const status = searchParams.get("status"); // "checked_in" | "not_arrived" | null

  const [event, invitees] = await Promise.all([
    prisma.event.findFirst({
      where:  { id: eventId, deletedAt: null },
      select: { id: true, name: true, eventDate: true, venueName: true, status: true },
    }),
    prisma.invitee.findMany({
      where: {
        eventId,
        deletedAt: null,
        ...(status ? { checkinStatus: status as "checked_in" | "not_arrived" } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: {
        id: true, name: true, phone: true, category: true,
        checkinStatus: true, rsvpStatus: true,
        checkins: {
          orderBy: { checkedInAt: "desc" },
          take:    1,
          select:  { checkedInAt: true, method: true },
        },
      },
      orderBy: [{ checkinStatus: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const total      = invitees.length;
  const checkedIn  = invitees.filter(i => i.checkinStatus === "checked_in").length;

  return NextResponse.json({
    event,
    summary:  { total, checkedIn, notArrived: total - checkedIn },
    invitees: invitees.map(i => ({
      ...i,
      checkinAt: i.checkins[0]?.checkedInAt ?? null,
      checkins:  undefined,
    })),
  });
}

/* POST — manual check-in */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await resolveAccess(req, eventId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { inviteeId, method } = parsed.data;

  const invitee = await prisma.invitee.findFirst({
    where: { id: inviteeId, eventId, deletedAt: null },
  });
  if (!invitee) return NextResponse.json({ error: "Invitee not found" }, { status: 404 });

  const max = invitee.seatType === "double" ? 2 : 1;
  if (invitee.checkinCount >= max) {
    return NextResponse.json(
      { error: max === 2 ? "Both seats already checked in" : "Already checked in" },
      { status: 409 }
    );
  }

  const newCount  = invitee.checkinCount + 1;
  const newStatus = newCount >= max ? "checked_in" : invitee.checkinStatus;

  await prisma.$transaction([
    prisma.invitee.update({
      where: { id: inviteeId },
      data:  { checkinCount: newCount, checkinStatus: newStatus },
    }),
    prisma.checkin.create({
      data: {
        eventId,
        inviteeId,
        organizerId: access.organizerId ?? access.userId,
        method:      method as "qr" | "manual",
        checkedInAt: new Date(),
        notes:       invitee.seatType === "double" ? `Seat ${newCount} of 2` : null,
      },
    }),
  ]);

  return NextResponse.json({ success: true, checkinStatus: newStatus, checkinCount: newCount });
}

/* PATCH — revert a check-in back to not_arrived */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = parseInt(params.eventId, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const access = await resolveAccess(req, eventId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteeId } = await req.json().catch(() => ({}));
  if (!inviteeId) return NextResponse.json({ error: "inviteeId required" }, { status: 400 });

  const invitee = await prisma.invitee.findFirst({
    where: { id: inviteeId, eventId, deletedAt: null },
  });
  if (!invitee) return NextResponse.json({ error: "Invitee not found" }, { status: 404 });

  if (invitee.checkinCount === 0) {
    return NextResponse.json({ error: "Invitee has not checked in" }, { status: 409 });
  }

  const newCount  = invitee.checkinCount - 1;
  const newStatus = newCount === 0 ? "not_arrived" : invitee.checkinStatus;

  const latest = await prisma.checkin.findFirst({
    where:   { inviteeId, eventId },
    orderBy: { checkedInAt: "desc" },
  });

  await prisma.$transaction([
    prisma.invitee.update({
      where: { id: inviteeId },
      data:  { checkinCount: newCount, checkinStatus: newStatus },
    }),
    ...(latest ? [prisma.checkin.delete({ where: { id: latest.id } })] : []),
  ]);

  return NextResponse.json({ success: true, checkinStatus: newStatus, checkinCount: newCount });
}
