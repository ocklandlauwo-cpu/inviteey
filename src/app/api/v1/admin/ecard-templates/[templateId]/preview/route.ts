import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { generateEcardBuffer, type EcardTextField } from "@/lib/ecard-generator";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

/* POST — render a one-off preview of a template with sample data (no DB records created) */
export async function POST(
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

    const buffer = await generateEcardBuffer({
      templateImagePath: template.imagePath,
      qrPosition:         template.qrPosition as { x?: number; y?: number; size?: number } | null,
      textFields:         template.textFields as EcardTextField[] | null,
      qrUrl:              `${APP_URL}/scan/preview`,
      invitee:            { name: "John Doe", category: "family" },
      event: {
        name:      "Sample Event",
        eventDate: new Date(),
        venueName: "Sample Venue",
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[POST /api/v1/admin/ecard-templates/:id/preview]", err);
    return NextResponse.json({ error: "Preview generation failed" }, { status: 500 });
  }
}
