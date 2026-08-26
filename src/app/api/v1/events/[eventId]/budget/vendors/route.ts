import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";

const schema = z.object({
  name:               z.string().min(1, "Name is required"),
  category:           z.enum(["catering", "photography", "decoration", "cake_champagne", "food", "drinks", "transport", "venue", "other"]),
  serviceDescription: z.string().optional(),
  estimatedCost:      z.number().int().nonnegative().nullable().optional(),
  agreedCost:         z.number().int().nonnegative().nullable().optional(),
  currencyCode:       z.string().optional(),
  paymentStatus:      z.enum(["unpaid", "partially_paid", "fully_paid"]).optional(),
  deliveryStatus:     z.enum(["confirmed", "in_progress", "completed", "issue_reported"]).optional(),
  contactPhone:       z.string().optional(),
  contactEmail:       z.string().email().optional().or(z.literal("")),
  notes:              z.string().optional(),
});

/* GET — list vendors for an event */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "vendors")) {
      return NextResponse.json({ error: "Vendor management requires Premium plan or above" }, { status: 403 });
    }

    const vendors = await prisma.vendor.findMany({
      where:   { eventId },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: vendors.map(v => ({
        ...v,
        estimatedCost: v.estimatedCost?.toString() ?? null,
        agreedCost:    v.agreedCost?.toString() ?? null,
      })),
    });
  } catch (err) {
    console.error("[GET /api/v1/events/:id/budget/vendors]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — add a vendor to an event */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "vendors")) {
      return NextResponse.json({ error: "Vendor management requires Premium plan or above" }, { status: 403 });
    }

    const data = parsed.data;

    const vendor = await prisma.vendor.create({
      data: {
        eventId,
        organizerId:        userId,
        name:               data.name,
        category:           data.category,
        serviceDescription: data.serviceDescription || null,
        estimatedCost:      data.estimatedCost != null ? BigInt(data.estimatedCost) : null,
        agreedCost:         data.agreedCost != null ? BigInt(data.agreedCost) : null,
        currencyCode:       data.currencyCode || "TZS",
        paymentStatus:      data.paymentStatus ?? "unpaid",
        deliveryStatus:     data.deliveryStatus ?? "confirmed",
        contactPhone:       data.contactPhone || null,
        contactEmail:       data.contactEmail || null,
        notes:              data.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...vendor,
        estimatedCost: vendor.estimatedCost?.toString() ?? null,
        agreedCost:    vendor.agreedCost?.toString() ?? null,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/budget/vendors]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
