import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import type { VendorDelStatus, VendorPayStatus } from "@prisma/client";

/* GET — all vendors across all events (admin) with optional filters */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const deliveryStatus = searchParams.get("deliveryStatus") as VendorDelStatus | null;
    const paymentStatus  = searchParams.get("paymentStatus")  as VendorPayStatus | null;
    const search         = searchParams.get("search")?.trim() ?? "";

    const vendors = await prisma.vendor.findMany({
      where: {
        ...(deliveryStatus ? { deliveryStatus } : {}),
        ...(paymentStatus  ? { paymentStatus  } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { event: { name: { contains: search, mode: "insensitive" } } },
          ],
        } : {}),
      },
      select: {
        id:              true,
        name:            true,
        category:        true,
        deliveryStatus:  true,
        paymentStatus:   true,
        agreedCost:      true,
        currencyCode:    true,
        contactPhone:    true,
        contactEmail:    true,
        userId:          true,
        event: {
          select: { id: true, name: true, eventDate: true, type: true },
        },
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { id: "desc" },
    });

    /* Serialize BigInt */
    const serialized = vendors.map(v => ({
      ...v,
      agreedCost: v.agreedCost !== null ? Number(v.agreedCost) : null,
    }));

    return NextResponse.json({ data: serialized });
  } catch (err) {
    console.error("[GET /api/v1/admin/vendors]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
