import { NextRequest, NextResponse } from "next/server";
import { z }          from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  deliveryStatus: z.enum(["confirmed","in_progress","completed","issue_reported"]),
  notes:          z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "vendor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = parseInt(params.vendorId, 10);
    if (isNaN(vendorId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const userId = parseInt(user.id, 10);
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, userId },
    });
    if (!vendor) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data:  {
        deliveryStatus: parsed.data.deliveryStatus,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/vendor/assignments/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
