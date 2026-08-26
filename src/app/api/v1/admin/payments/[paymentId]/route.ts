import { NextRequest, NextResponse } from "next/server";
import { z }           from "zod";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";

const patchSchema = z.object({
  serviceType:     z.string().min(1).max(50).optional(),
  description:     z.string().optional().nullable(),
  amount:          z.number().int().positive().optional(),
  currencyCode:    z.string().length(3).optional(),
  paymentMethod:   z.string().min(1).max(30).optional(),
  referenceNumber: z.string().optional().nullable(),
  status:          z.enum(["confirmed","refunded"]).optional(),
  paidAt:          z.string().min(1).optional(),
  notes:           z.string().optional().nullable(),
});

async function getPaymentOrError(paymentId: number) {
  const payment = await prisma.platformPayment.findFirst({
    where: { id: BigInt(paymentId), deletedAt: null },
  });
  return payment;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paymentId = parseInt(params.paymentId, 10);
    if (isNaN(paymentId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await getPaymentOrError(paymentId);
    if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const { paidAt, amount, ...rest } = parsed.data;

    const updated = await prisma.platformPayment.update({
      where: { id: BigInt(paymentId) },
      data: {
        ...rest,
        ...(amount  !== undefined ? { amount: BigInt(amount) } : {}),
        ...(paidAt  !== undefined ? { paidAt: new Date(paidAt) } : {}),
      },
      include: {
        organizer:       { select: { id: true, name: true, email: true } },
        event:           { select: { id: true, name: true, type: true } },
        confirmedByUser: { select: { id: true, name: true } },
      },
    });

    const adminId = parseInt(user.id, 10);
    await prisma.auditLog.create({
      data: {
        tableName: "platform_payments",
        recordId:  paymentId,
        operation: "UPDATE",
        oldData:   { ...existing, id: existing.id.toString(), amount: Number(existing.amount) } as any,
        newData:   parsed.data as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...updated, id: updated.id.toString(), amount: Number(updated.amount) },
    });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/payments/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paymentId = parseInt(params.paymentId, 10);
    if (isNaN(paymentId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const existing = await getPaymentOrError(paymentId);
    if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    await prisma.platformPayment.update({
      where: { id: BigInt(paymentId) },
      data:  { deletedAt: new Date() },
    });

    const adminId = parseInt(user.id, 10);
    await prisma.auditLog.create({
      data: {
        tableName: "platform_payments",
        recordId:  paymentId,
        operation: "DELETE",
        oldData:   { ...existing, id: existing.id.toString(), amount: Number(existing.amount) } as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/payments/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
