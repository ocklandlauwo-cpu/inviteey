import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const schema = z.object({
  name:   z.string().min(2).max(100).optional(),
  email:  z.string().email().optional(),
  phone:  z.string().optional().nullable(),
  role:   z.enum(["organizer", "admin", "vendor", "staff"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { user: adminUser } = await getSession();
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { name, email, phone, role, status } = parsed.data;

    if (status !== undefined && target.role === "admin") {
      return NextResponse.json({ error: "Cannot suspend admins" }, { status: 403 });
    }

    if (role !== undefined && userId === parseInt(adminUser.id, 10)) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    if (email !== undefined && email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: "users",
        recordId:  userId,
        operation: "UPDATE",
        oldData:   { name: target.name, email: target.email, phone: target.phone, role: target.role, status: target.status },
        newData:   { name: updated.name, email: updated.email, phone: updated.phone, role: updated.role, status: updated.status },
        changedBy: parseInt(adminUser.id, 10),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id:     updated.id,
        name:   updated.name,
        email:  updated.email,
        phone:  updated.phone,
        role:   updated.role,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/users/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
