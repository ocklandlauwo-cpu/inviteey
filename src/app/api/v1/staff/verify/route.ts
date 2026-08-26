import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, pin } = await req.json().catch(() => ({}));
    if (!token || !pin) return NextResponse.json({ error: "token and pin required" }, { status: 400 });

    const staff = await prisma.eventStaff.findFirst({
      where: { accessToken: token, expiresAt: { gt: new Date() } },
      select: { eventId: true, pin: true },
    });

    if (!staff || staff.pin !== String(pin)) {
      return NextResponse.json({ error: "Invalid or expired PIN" }, { status: 401 });
    }

    return NextResponse.json({ eventId: staff.eventId });
  } catch (err) {
    console.error("[POST /api/v1/staff/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
