import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs   from "fs/promises";
import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import type { EventType } from "@prisma/client";

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const TEMPLATES_DIR = path.resolve(UPLOADS_DIR, "templates");

/* GET — list all e-card templates (admin) */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get("eventType") as EventType | null;

    const templates = await prisma.ecardTemplate.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ data: templates });
  } catch (err) {
    console.error("[GET /api/v1/admin/ecard-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — upload a new e-card template (admin, multipart/form-data) */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const name      = (form.get("name") as string | null)?.trim();
    const eventType = form.get("eventType") as EventType | null;
    const qrX       = parseInt((form.get("qrX")    as string) ?? "650", 10);
    const qrY       = parseInt((form.get("qrY")    as string) ?? "550", 10);
    const qrSize    = parseInt((form.get("qrSize") as string) ?? "180", 10);
    const qrEnabled = (form.get("qrEnabled") as string | null) !== "false";
    const file      = form.get("image") as File | null;
    const textFieldsRaw = form.get("textFields") as string | null;
    let textFields: unknown[] = [];
    if (textFieldsRaw) {
      try {
        const parsed = JSON.parse(textFieldsRaw);
        if (Array.isArray(parsed)) textFields = parsed;
      } catch {}
    }

    if (!name || !eventType || !file) {
      return NextResponse.json({ error: "name, eventType, and image are required" }, { status: 400 });
    }

    const VALID_TYPES: EventType[] = ["wedding","birthday","sendoff","kitchen_party","corporate","fundraising","other"];
    if (!VALID_TYPES.includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    if (![".jpg",".jpeg",".png",".webp"].includes(ext)) {
      return NextResponse.json({ error: "Image must be jpg, png, or webp" }, { status: 400 });
    }

    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    await fs.mkdir(path.join(TEMPLATES_DIR, "thumbnails"), { recursive: true });

    const slug     = `${Date.now()}_${name.toLowerCase().replace(/\s+/g,"_").slice(0, 40)}`;
    const filename = `${slug}${ext}`;
    const thumbFilename = `${slug}_thumb.jpg`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    await fs.writeFile(path.join(TEMPLATES_DIR, filename), bytes);

    await sharp(Buffer.from(bytes))
      .resize(300, 375, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(path.join(TEMPLATES_DIR, "thumbnails", thumbFilename));

    const template = await prisma.ecardTemplate.create({
      data: {
        name,
        eventType,
        imagePath:     filename,
        thumbnailPath: `thumbnails/${thumbFilename}`,
        qrPosition:    { x: qrX, y: qrY, size: qrSize },
        qrEnabled,
        textFields:    JSON.parse(JSON.stringify(textFields)),
        isActive:      true,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/admin/ecard-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
