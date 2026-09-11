import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";

const createSchema = z.object({
  name:           z.string().min(2).max(200),
  wid:            z.string().min(1).max(100),
  hasImageHeader: z.boolean().default(false),
});

/* GET — list registered AuthKey WhatsApp templates (admin) */
export async function GET() {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.whatsappTemplate.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ data: templates });
  } catch (err) {
    console.error("[GET /api/v1/admin/whatsapp-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — register a new AuthKey WhatsApp template (admin) */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const template = await prisma.whatsappTemplate.create({ data: parsed.data });
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/whatsapp-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
