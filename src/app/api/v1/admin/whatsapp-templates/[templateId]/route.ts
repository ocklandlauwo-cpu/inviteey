import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

/* PATCH — update name / wid / hasImageHeader / isActive */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.templateId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const template = await prisma.whatsappTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (typeof body.name           === "string")  data.name           = body.name.trim();
    if (typeof body.wid            === "string")  data.wid            = body.wid.trim();
    if (typeof body.hasImageHeader === "boolean") data.hasImageHeader = body.hasImageHeader;
    if (typeof body.isActive       === "boolean") data.isActive       = body.isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.whatsappTemplate.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/whatsapp-templates/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* DELETE — remove a registered template */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.templateId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const template = await prisma.whatsappTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await prisma.whatsappTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/whatsapp-templates/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
