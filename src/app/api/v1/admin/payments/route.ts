import { NextRequest, NextResponse } from "next/server";
import { z }            from "zod";
import { getSession }   from "@/lib/auth";
import { prisma }       from "@/lib/prisma";

const createSchema = z.object({
  organizerId:     z.number().int().positive(),
  eventId:         z.number().int().positive().optional().nullable(),
  serviceType:     z.string().min(1).max(50),
  description:     z.string().optional().nullable(),
  amount:          z.number().int().positive(),
  currencyCode:    z.string().length(3).default("TZS"),
  paymentMethod:   z.string().min(1).max(30).default("mpesa"),
  referenceNumber: z.string().optional().nullable(),
  status:          z.enum(["confirmed","refunded"]).default("confirmed"),
  paidAt:          z.string().min(1),
  notes:           z.string().optional().nullable(),
});

/* GET — paginated list with filters */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize     = 25;
    const organizerId  = searchParams.get("organizerId")  ? parseInt(searchParams.get("organizerId")!, 10)  : undefined;
    const eventId      = searchParams.get("eventId")      ? parseInt(searchParams.get("eventId")!,      10)  : undefined;
    const serviceType  = searchParams.get("serviceType")  ?? undefined;
    const status       = searchParams.get("status")       ?? undefined;
    const paymentMethod= searchParams.get("paymentMethod")?? undefined;

    const where = {
      deletedAt:  null,
      ...(organizerId  ? { organizerId }  : {}),
      ...(eventId      ? { eventId }      : {}),
      ...(serviceType  ? { serviceType }  : {}),
      ...(status       ? { status }       : {}),
      ...(paymentMethod? { paymentMethod }: {}),
    };

    const [total, payments] = await Promise.all([
      prisma.platformPayment.count({ where }),
      prisma.platformPayment.findMany({
        where,
        include: {
          organizer:       { select: { id: true, name: true, email: true, phone: true } },
          event:           { select: { id: true, name: true, type: true, tier: true } },
          confirmedByUser: { select: { id: true, name: true } },
        },
        orderBy: { paidAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data:    payments.map(p => ({ ...p, id: p.id.toString(), amount: Number(p.amount) })),
      meta:    { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — record a new payment */
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
    const { organizerId, eventId, serviceType, description, amount, currencyCode,
            paymentMethod, referenceNumber, status, paidAt, notes } = parsed.data;

    const payment = await prisma.platformPayment.create({
      data: {
        organizerId,
        eventId:         eventId ?? null,
        serviceType,
        description:     description ?? null,
        amount:          BigInt(amount),
        currencyCode,
        paymentMethod,
        referenceNumber: referenceNumber ?? null,
        status,
        paidAt:          new Date(paidAt),
        confirmedBy:     adminId,
        notes:           notes ?? null,
      },
      include: {
        organizer:       { select: { id: true, name: true, email: true } },
        event:           { select: { id: true, name: true, type: true } },
        confirmedByUser: { select: { id: true, name: true } },
      },
    });

    /* Audit log */
    await prisma.auditLog.create({
      data: {
        tableName: "platform_payments",
        recordId:  Number(payment.id),
        operation: "INSERT",
        newData:   { serviceType, amount, currencyCode, organizerId, eventId } as any,
        changedBy: adminId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...payment, id: payment.id.toString(), amount: Number(payment.amount) },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
