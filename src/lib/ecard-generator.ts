import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export interface EcardTextField {
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
  event:   { name: string; eventDate: Date | string; venueName: string } | null,
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

export interface GenerateEcardOptions {
  templateImagePath: string; // bare filename under uploads/templates/
  qrPosition:        { x?: number; y?: number; size?: number } | null;
  qrEnabled?:         boolean;
  textFields:        EcardTextField[] | null;
  qrUrl:              string;
  invitee:            { name: string; category: string };
  event:              { name: string; eventDate: Date | string; venueName: string } | null;
}

/** Composite a QR code + dynamic text fields onto a template image. Shared by
 *  the real generation worker and the admin template preview endpoint, so
 *  both always render identically. */
export async function generateEcardBuffer(opts: GenerateEcardOptions): Promise<Buffer> {
  const qrEnabled = opts.qrEnabled !== false;

  const templatePath = path.resolve(UPLOADS_DIR, "templates", opts.templateImagePath);

  let qrResized: Buffer | null = null;

  if (qrEnabled) {
    const qrData = await QRCode.toBuffer(opts.qrUrl, {
      type:                 "png",
      width:                200,
      margin:               2,
      color:                { dark: "#1C1917", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    const qrPos  = opts.qrPosition ?? {};
    const qrSize = qrPos.size ?? 180;

    qrResized = await sharp(qrData).resize(qrSize, qrSize).toBuffer();
  }

  const { width: imgW = 800, height: imgH = 1000 } = await sharp(templatePath).metadata();

  const fields = opts.textFields ?? [];

  let textOverlay: sharp.OverlayOptions;

  if (fields.length > 0) {
    const elements = fields.map(f => {
      const text   = getFieldValue(f, opts.invitee, opts.event);
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
    textOverlay = {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100">` +
        `<text x="400" y="60" font-family="Arial,sans-serif" font-size="32px" font-weight="bold" ` +
        `fill="#1C1917" text-anchor="middle">${escapeXml(opts.invitee.name)}</text></svg>`
      ),
      top:   80,
      left:  0,
      blend: "over",
    };
  }

  const composites: sharp.OverlayOptions[] = [];

  if (qrResized) {
    const qrPos = opts.qrPosition ?? {};
    composites.push({ input: qrResized, top: qrPos.y ?? 550, left: qrPos.x ?? 650 });
  }

  composites.push(textOverlay);

  return sharp(templatePath)
    .composite(composites)
    .jpeg({ quality: 88 })
    .toBuffer();
}
