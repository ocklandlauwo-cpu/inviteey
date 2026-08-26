import { NextRequest, NextResponse } from "next/server";
import { parse }      from "csv-parse/sync";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { canAccessFeature, getInviteeLimit } from "@/lib/tier-access";

const VALID_CATEGORIES = ["family","friends","colleagues","vip","other"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { user } = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const userId = parseInt(user.id, 10);
    const event  = await prisma.event.findFirst({
      where: user.role === "admin"
        ? { id: eventId, deletedAt: null }
        : { id: eventId, organizerId: userId, deletedAt: null },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (!canAccessFeature(event.tier, "exportCsv") && user.role !== "admin") {
      return NextResponse.json({ error: "CSV import requires Standard tier or above" }, { status: 403 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();

    let rows: Record<string, string>[];
    try {
      rows = parse(text, {
        columns:          true,
        skip_empty_lines: true,
        trim:             true,
      }) as Record<string, string>[];
    } catch {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }

    if (rows.length === 0) return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    if (rows.length > 1000) return NextResponse.json({ error: "CSV may not exceed 1,000 rows" }, { status: 400 });

    /* Check invitee limit */
    const currentCount = await prisma.invitee.count({ where: { eventId, deletedAt: null } });
    const limit        = getInviteeLimit(event.tier);
    const available    = limit - currentCount;
    if (available <= 0) return NextResponse.json({ error: "Invitee limit reached for this tier" }, { status: 403 });

    /* Existing phones/emails for duplicate check */
    const existing = await prisma.invitee.findMany({
      where:  { eventId, deletedAt: null },
      select: { phone: true, email: true },
    });
    const existingPhones = new Set(existing.map(i => i.phone).filter(Boolean) as string[]);
    const existingEmails = new Set(existing.map(i => i.email).filter(Boolean) as string[]);

    const toCreate: { name: string; phone?: string; email?: string; category: string }[] = [];
    const rowErrors: { row: number; reason: string }[] = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row  = rows[i];
      const name = (row["name"] ?? row["Name"] ?? "").trim();
      if (!name) { rowErrors.push({ row: i + 2, reason: "Missing name" }); continue; }

      const phone    = (row["phone"] ?? row["Phone"] ?? "").trim() || undefined;
      const email    = (row["email"] ?? row["Email"] ?? "").trim().toLowerCase() || undefined;
      const catRaw   = (row["category"] ?? row["Category"] ?? "other").trim().toLowerCase();
      const category = VALID_CATEGORIES.includes(catRaw as typeof VALID_CATEGORIES[number])
        ? catRaw : "other";

      if (phone && (existingPhones.has(phone) || seenPhones.has(phone))) {
        rowErrors.push({ row: i + 2, reason: `Duplicate phone ${phone}` }); continue;
      }
      if (email && (existingEmails.has(email) || seenEmails.has(email))) {
        rowErrors.push({ row: i + 2, reason: `Duplicate email ${email}` }); continue;
      }

      if (toCreate.length >= available) {
        rowErrors.push({ row: i + 2, reason: "Invitee limit reached" }); continue;
      }

      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
      toCreate.push({ name, phone, email, category });
    }

    let imported = 0;
    if (toCreate.length > 0) {
      await prisma.invitee.createMany({
        data: toCreate.map(r => ({
          eventId,
          organizerId: event.organizerId,
          name:        r.name,
          phone:       r.phone ?? null,
          email:       r.email ?? null,
          category:    r.category as "family"|"friends"|"colleagues"|"vip"|"other",
        })),
      });
      imported = toCreate.length;
    }

    return NextResponse.json({
      imported,
      skipped: rowErrors.length,
      errors:  rowErrors.slice(0, 20),
    });
  } catch (err) {
    console.error("[POST /api/v1/events/:id/invitees/import]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
