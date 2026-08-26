import { NextRequest, NextResponse } from "next/server";
import { z }           from "zod";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";

const patchSchema = z.object({
  description:  z.string().optional().nullable(),
  amount:       z.number().int().positive().optional(),
  currencyCode: z.string().length(3).optional(),
  dueDate:      z.string().optional().nullable(),
  status:       z.enum(["pending","cancelled"]).optional(),
  notes:        z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoiceId = parseInt(params.invoiceId, 10);
    if (isNaN(invoiceId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await prisma.platformInvoice.findFirst({
      where: { id: BigInt(invoiceId), deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (existing.status === "paid") {
      return NextResponse.json({ error: "Cannot edit a paid invoice" }, { status: 409 });
    }

    const { amount, dueDate, ...rest } = parsed.data;
    const updated = await prisma.platformInvoice.update({
      where: { id: BigInt(invoiceId) },
      data: {
        ...rest,
        ...(amount  !== undefined ? { amount: BigInt(amount) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: {
        organizer:    { select: { id: true, name: true, email: true } },
        event:        { select: { id: true, name: true, type: true } },
        createdByUser:{ select: { id: true, name: true } },
        payment:      { select: { id: true, paidAt: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        id:     updated.id.toString(),
        amount: Number(updated.amount),
        payment: updated.payment ? { ...updated.payment, id: updated.payment.id.toString() } : null,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/invoices/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoiceId = parseInt(params.invoiceId, 10);
    if (isNaN(invoiceId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const existing = await prisma.platformInvoice.findFirst({
      where: { id: BigInt(invoiceId), deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (existing.status === "paid") {
      return NextResponse.json({ error: "Cannot delete a paid invoice" }, { status: 409 });
    }

    await prisma.platformInvoice.update({
      where: { id: BigInt(invoiceId) },
      data:  { deletedAt: new Date(), status: "cancelled" },
    });

    const adminId = parseInt(user.id, 10);
    await prisma.auditLog.create({
      data: {
        tableName: "platform_invoices",
        recordId:  invoiceId,
        operation: "DELETE",
        oldData:   { ...existing, id: existing.id.toString(), amount: Number(existing.amount) } as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/invoices/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
