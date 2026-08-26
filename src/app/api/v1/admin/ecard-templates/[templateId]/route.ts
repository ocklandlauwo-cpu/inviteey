import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs   from "fs/promises";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const UPLOADS_DIR   = process.env.UPLOAD_DIR ?? "./uploads";
const TEMPLATES_DIR = path.resolve(UPLOADS_DIR, "templates");

/* PATCH — update name / eventType / qrPosition / isActive */
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

    const template = await prisma.ecardTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (typeof body.name      === "string")  data.name      = body.name.trim();
    if (typeof body.isActive  === "boolean") data.isActive  = body.isActive;
    if (Array.isArray(body.textFields)) {
      data.textFields = JSON.parse(JSON.stringify(body.textFields));
    }
    if (typeof body.qrX === "number" || typeof body.qrY === "number" || typeof body.qrSize === "number") {
      const prev = (template.qrPosition as Record<string, number> | null) ?? {};
      data.qrPosition = {
        x:    typeof body.qrX    === "number" ? body.qrX    : prev.x    ?? 650,
        y:    typeof body.qrY    === "number" ? body.qrY    : prev.y    ?? 550,
        size: typeof body.qrSize === "number" ? body.qrSize : prev.size ?? 180,
      };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.ecardTemplate.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/v1/admin/ecard-templates/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* DELETE — remove template + files */
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

    const template = await prisma.ecardTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await prisma.ecardTemplate.delete({ where: { id } });

    /* Best-effort file cleanup */
    const rmSilent = (p: string) => fs.unlink(p).catch(() => undefined);
    rmSilent(path.join(TEMPLATES_DIR, template.imagePath));
    if (template.thumbnailPath) rmSilent(path.join(TEMPLATES_DIR, template.thumbnailPath));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/ecard-templates/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
