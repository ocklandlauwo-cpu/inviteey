import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature } from "@/lib/tier-access";

const schema = z.object({
  name:               z.string().min(1).optional(),
  category:           z.enum(["catering", "photography", "decoration", "cake_champagne", "food", "drinks", "transport", "venue", "other"]).optional(),
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

async function getOwnedVendor(eventId: number, vendorId: number, userId: number) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: userId, deletedAt: null },
  });
  if (!event) return { event: null, vendor: null };

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, eventId },
  });
  return { event, vendor };
}

/* PATCH — update a vendor */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string; vendorId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId  = parseInt(params.eventId, 10);
    const vendorId = parseInt(params.vendorId, 10);
    if (isNaN(eventId) || isNaN(vendorId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const { event, vendor } = await getOwnedVendor(eventId, vendorId, userId);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "vendors")) {
      return NextResponse.json({ error: "Vendor management requires Premium plan or above" }, { status: 403 });
    }

    const data = parsed.data;

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.serviceDescription !== undefined && { serviceDescription: data.serviceDescription || null }),
        ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost != null ? BigInt(data.estimatedCost) : null }),
        ...(data.agreedCost !== undefined && { agreedCost: data.agreedCost != null ? BigInt(data.agreedCost) : null }),
        ...(data.currencyCode !== undefined && { currencyCode: data.currencyCode }),
        ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
        ...(data.deliveryStatus !== undefined && { deliveryStatus: data.deliveryStatus }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        estimatedCost: updated.estimatedCost?.toString() ?? null,
        agreedCost:    updated.agreedCost?.toString() ?? null,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/v1/events/:id/budget/vendors/:vendorId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* DELETE — remove a vendor */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string; vendorId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId  = parseInt(params.eventId, 10);
    const vendorId = parseInt(params.vendorId, 10);
    if (isNaN(eventId) || isNaN(vendorId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const userId = parseInt(user.id, 10);
    const { event, vendor } = await getOwnedVendor(eventId, vendorId, userId);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    await prisma.vendor.delete({ where: { id: vendorId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/events/:id/budget/vendors/:vendorId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
