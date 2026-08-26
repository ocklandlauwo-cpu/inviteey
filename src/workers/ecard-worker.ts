import { Worker, type Job } from "bullmq";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import type { EcardJobData } from "./queues";

const redisConnection = {
  host:                 process.env.REDIS_HOST ?? "127.0.0.1",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as unknown as null,
};

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

interface EcardTextField {
  key:          "inviteeName" | "eventTitle" | "date" | "venue" | "category" | "custom";
  staticValue?: string;
  x:            number;
  y:            number;
  fontSize:     number;
  color:        string;
  bold?:        boolean;
  align?:       "left" | "center" | "right";
}

const CATEGORY_LABELS: Record<string, string> = {
  family: "Family", friends: "Friends", colleagues: "Colleagues", vip: "VIP", other: "Guest",
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFieldValue(
  field:   EcardTextField,
  invitee: { name: string; category: string },
  event:   { name: string; eventDate: Date; venueName: string } | null,
): string {
  switch (field.key) {
    case "inviteeName": return invitee.name;
    case "eventTitle":  return event?.name        ?? "";
    case "date":        return event ? formatDate(event.eventDate) : "";
    case "venue":       return event?.venueName   ?? "";
    case "category":    return CATEGORY_LABELS[invitee.category] ?? invitee.category;
    case "custom":      return field.staticValue  ?? "";
    default:            return "";
  }
}

function escapeXml(str: string) {
  return str.replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c)
  );
}

async function processEcard(job: Job<EcardJobData>) {
  const { ecardId, inviteeId, templateId } = job.data;

  const [ecard, invitee, template] = await Promise.all([
    prisma.ecard.findUnique({ where: { id: ecardId } }),
    prisma.invitee.findUnique({ where: { id: inviteeId }, include: { event: true } }),
    prisma.ecardTemplate.findUnique({ where: { id: templateId } }),
  ]);

  if (!ecard || !invitee || !template) {
    throw new Error(`Missing data: ecard=${!!ecard} invitee=${!!invitee} template=${!!template}`);
  }

  await prisma.ecard.update({ where: { id: ecardId }, data: { status: "processing" } });

  /* Generate QR code pointing to the scan/check-in URL */
  const qrUrl  = `${APP_URL}/scan/${invitee.qrToken}`;
  const qrData = await QRCode.toBuffer(qrUrl, {
    type:                 "png",
    width:                200,
    margin:               2,
    color:                { dark: "#1C1917", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  const templatePath = path.resolve(UPLOADS_DIR, "templates", template.imagePath);
  const outputDir    = path.resolve(UPLOADS_DIR, "ecards");
  await fs.mkdir(outputDir, { recursive: true });

  const outputFilename = `ecard_${ecardId}_${inviteeId}.jpg`;
  const outputPath     = path.join(outputDir, outputFilename);

  const qrPos  = (template.qrPosition as { x?: number; y?: number; size?: number } | null) ?? {};
  const qrX    = qrPos.x    ?? 650;
  const qrY    = qrPos.y    ?? 550;
  const qrSize = qrPos.size ?? 180;

  const qrResized = await sharp(qrData).resize(qrSize, qrSize).toBuffer();

  /* Resolve image dimensions so the SVG canvas covers the entire card */
  const { width: imgW = 800, height: imgH = 1000 } = await sharp(templatePath).metadata();

  const fields = (template.textFields as EcardTextField[] | null) ?? [];

  let textOverlay: sharp.OverlayOptions;

  if (fields.length > 0) {
    /* Build a single full-image SVG containing all configured text overlays */
    const elements = fields.map(f => {
      const text   = getFieldValue(f, invitee, invitee.event);
      const anchor = f.align === "center" ? "middle" : f.align === "right" ? "end" : "start";
      const weight = f.bold ? "bold" : "normal";
      return `<text x="${f.x}" y="${f.y}" font-family="Arial,Helvetica,sans-serif" ` +
        `font-size="${f.fontSize}px" font-weight="${weight}" fill="${f.color || "#ffffff"}" ` +
        `text-anchor="${anchor}">${escapeXml(text)}</text>`;
    }).join("\n");

    textOverlay = {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">${elements}</svg>`
      ),
      top:   0,
      left:  0,
      blend: "over",
    };
  } else {
    /* Fallback: invitee name only, placed near the top of the card */
    textOverlay = {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100">` +
        `<text x="400" y="60" font-family="Arial,sans-serif" font-size="32px" font-weight="bold" ` +
        `fill="#1C1917" text-anchor="middle">${escapeXml(invitee.name)}</text></svg>`
      ),
      top:   80,
      left:  0,
      blend: "over",
    };
  }

  await sharp(templatePath)
    .composite([
      { input: qrResized, top: qrY, left: qrX },
      textOverlay,
    ])
    .jpeg({ quality: 88 })
    .toFile(outputPath);

  await prisma.ecard.update({
    where: { id: ecardId },
    data:  { status: "completed", imagePath: `ecards/${outputFilename}` },
  });

  console.log(`[ecard-worker] Generated ecard ${ecardId} for invitee ${inviteeId}`);
}

export function startEcardWorker() {
  const worker = new Worker<EcardJobData>("ecard-generation", processEcard, {
    connection:  redisConnection,
    concurrency: 2,
  });

  worker.on("completed", job => console.log(`[ecard-worker] Job ${job.id} completed`));
  worker.on("failed",    (job, err) => {
    console.error(`[ecard-worker] Job ${job?.id} failed:`, err.message);
    if (job?.data.ecardId) {
      prisma.ecard.update({
        where: { id: job.data.ecardId },
        data:  { status: "failed" },
      }).catch(console.error);
    }
  });

  return worker;
}
