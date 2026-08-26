import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  amount: z.number().int().positive(),
  paidAt: z.string().datetime({ offset: true }).optional(),
  notes:  z.string().optional(),
});

/* POST — record a payment against a pledge */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; pledgeId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId  = parseInt(params.eventId,  10);
    const pledgeId = parseInt(params.pledgeId, 10);
    if (isNaN(eventId) || isNaN(pledgeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);

    const pledge = await prisma.pledge.findFirst({
      where:   { id: pledgeId, eventId, organizerId: userId, deletedAt: null },
      include: { payments: { where: { deletedAt: null }, select: { amount: true } } },
    });
    if (!pledge) return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

    const { amount, paidAt, notes } = parsed.data;

    const payment = await prisma.payment.create({
      data: {
        pledgeId,
        eventId,
        organizerId: userId,
        amount:      BigInt(amount),
        paidAt:      paidAt ? new Date(paidAt) : new Date(),
        notes:       notes ?? null,
      },
    });

    /* Recalculate pledge status */
    const totalPaid = pledge.payments.reduce(
      (sum, p) => sum + p.amount,
      BigInt(amount)
    );
    const newStatus =
      totalPaid >= pledge.amount ? "fully_paid" :
      totalPaid >  BigInt(0)     ? "partially_paid" : "unpaid";

    await prisma.pledge.update({
      where: { id: pledgeId },
      data:  { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      data:    { ...payment, amount: payment.amount.toString() },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/pledges/:id/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
