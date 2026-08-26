import { NextRequest, NextResponse } from "next/server";
import { z }           from "zod";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";

const paySchema = z.object({
  paymentMethod:   z.string().min(1).max(30),
  referenceNumber: z.string().optional().nullable(),
  paidAt:          z.string().min(1),
  notes:           z.string().optional().nullable(),
});

/* POST — mark invoice as paid, create linked payment record */
export async function POST(
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

    const parsed = paySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const invoice = await prisma.platformInvoice.findFirst({
      where: { id: BigInt(invoiceId), deletedAt: null },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice already paid" }, { status: 409 });
    }
    if (invoice.status === "cancelled") {
      return NextResponse.json({ error: "Cannot pay a cancelled invoice" }, { status: 409 });
    }

    const adminId = parseInt(user.id, 10);
    const { paymentMethod, referenceNumber, paidAt, notes } = parsed.data;

    /* Atomically: create payment + mark invoice paid */
    const [payment] = await prisma.$transaction([
      prisma.platformPayment.create({
        data: {
          organizerId:     invoice.organizerId,
          eventId:         invoice.eventId,
          serviceType:     invoice.serviceType,
          description:     invoice.description,
          amount:          invoice.amount,
          currencyCode:    invoice.currencyCode,
          paymentMethod,
          referenceNumber: referenceNumber ?? null,
          status:          "confirmed",
          paidAt:          new Date(paidAt),
          confirmedBy:     adminId,
          notes:           notes ?? null,
          invoiceId:       BigInt(invoiceId),
        },
      }),
      prisma.platformInvoice.update({
        where: { id: BigInt(invoiceId) },
        data:  { status: "paid" },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        tableName: "platform_invoices",
        recordId:  invoiceId,
        operation: "UPDATE",
        oldData:   { status: "pending" } as any,
        newData:   { status: "paid", paymentId: payment.id.toString() } as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...payment, id: payment.id.toString(), amount: Number(payment.amount) },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/invoices/:id/pay]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
