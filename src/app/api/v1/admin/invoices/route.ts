import { NextRequest, NextResponse } from "next/server";
import { z }           from "zod";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";

const createSchema = z.object({
  organizerId:  z.number().int().positive(),
  eventId:      z.number().int().positive(),
  serviceType:  z.string().min(1).max(50),
  description:  z.string().optional().nullable(),
  amount:       z.number().int().positive(),
  currencyCode: z.string().length(3).default("TZS"),
  dueDate:      z.string().optional().nullable(),
  notes:        z.string().optional().nullable(),
});

/* GET — paginated invoice list with filters */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize    = 25;
    const organizerId = searchParams.get("organizerId") ? parseInt(searchParams.get("organizerId")!, 10) : undefined;
    const eventId     = searchParams.get("eventId")     ? parseInt(searchParams.get("eventId")!,     10) : undefined;
    const status      = searchParams.get("status")      ?? undefined;
    const serviceType = searchParams.get("serviceType") ?? undefined;

    const where = {
      deletedAt: null,
      ...(organizerId ? { organizerId } : {}),
      ...(eventId     ? { eventId }     : {}),
      ...(status      ? { status }      : {}),
      ...(serviceType ? { serviceType } : {}),
    };

    const [total, invoices] = await Promise.all([
      prisma.platformInvoice.count({ where }),
      prisma.platformInvoice.findMany({
        where,
        include: {
          organizer:    { select: { id: true, name: true, email: true } },
          event:        { select: { id: true, name: true, type: true, tier: true } },
          createdByUser:{ select: { id: true, name: true } },
          payment:      { select: { id: true, paymentMethod: true, referenceNumber: true, paidAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data:    invoices.map(inv => ({
        ...inv,
        id:     inv.id.toString(),
        amount: Number(inv.amount),
        payment: inv.payment ? { ...inv.payment, id: inv.payment.id.toString() } : null,
      })),
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/invoices]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — create invoice */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const adminId = parseInt(user.id, 10);
    const { organizerId, eventId, serviceType, description, amount, currencyCode, dueDate, notes } = parsed.data;

    const invoice = await prisma.platformInvoice.create({
      data: {
        organizerId,
        eventId,
        serviceType,
        description:  description ?? null,
        amount:       BigInt(amount),
        currencyCode,
        status:       "pending",
        dueDate:      dueDate ? new Date(dueDate) : null,
        notes:        notes ?? null,
        createdBy:    adminId,
      },
      include: {
        organizer:    { select: { id: true, name: true, email: true } },
        event:        { select: { id: true, name: true, type: true, tier: true } },
        createdByUser:{ select: { id: true, name: true } },
        payment:      true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: "platform_invoices",
        recordId:  Number(invoice.id),
        operation: "INSERT",
        newData:   { organizerId, eventId, serviceType, amount, currencyCode } as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...invoice, id: invoice.id.toString(), amount: Number(invoice.amount), payment: null },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/invoices]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
