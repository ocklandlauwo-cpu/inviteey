import axios from "axios";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

interface SendWhatsAppOptions {
  to:       string;
  message:  string;
  imageUrl?: string;
}

export interface WhatsAppSendResult {
  success:  boolean;
  auto:     boolean;     // true = sent via API  /  false = deep-link returned
  deepLink?: string;
  error?:   string;
}

/** Normalise TZ phone numbers to E.164 format */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0")   && digits.length === 10) return `+255${digits.slice(1)}`;
  if (digits.startsWith("7")   && digits.length === 9)  return `+255${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Send a WhatsApp message.
 * Uses WaSender API if WASENDER_API_TOKEN is set; otherwise returns a wa.me deep link.
 */
export async function sendWhatsApp({ to, message, imageUrl }: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
  const token  = process.env.WASENDER_API_TOKEN;
  const apiUrl = process.env.WASENDER_API_URL;

  if (token && token !== "mock-wasender-token" && apiUrl) {
    try {
      const payload = imageUrl
        ? { phone: to, message, imageUrl }
        : { phone: to, message };

      await axios.post(`${apiUrl}/send-message`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return { success: true, auto: true };
    } catch (e) {
      console.error("[whatsapp] WaSender error:", e);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[WHATSAPP MOCK] To: ${to}\nMessage: ${message}${imageUrl ? `\nImage: ${imageUrl}` : ""}`);
  }

  /* Fallback: wa.me deep link (manual send) */
  const cleanNum = normalisePhone(to).replace("+", "");
  const deepLink = `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  return { success: true, auto: false, deepLink };
}

/** Build the invitation message text used when sending an e-card */
export function buildInvitationMessage(opts: {
  guestName: string;
  eventName: string;
  eventDate: Date | string;
  venue:     string;
  pin:       string | null;
  ecardUrl?: string;
}): string {
  const date = new Date(opts.eventDate).toLocaleDateString("en-TZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const lines = [
    `Dear ${opts.guestName},`,
    ``,
    `You are cordially invited to *${opts.eventName}*.`,
    `📅 ${date}`,
    `📍 ${opts.venue}`,
    ``,
  ];

  if (opts.ecardUrl) {
    lines.push(`Your e-invitation is attached above.`, ``);
  }

  if (opts.pin) {
    lines.push(
      `Your check-in PIN: *${opts.pin}*`,
      `_(Show this at the entrance if you cannot scan the QR code)_`,
      ``,
    );
  }

  lines.push(`Powered by ${APP_URL}`);
  return lines.join("\n");
}

export function verifyWasenderWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", process.env.WASENDER_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(signature)), new Uint8Array(Buffer.from(expected)));
}

export function parseRsvpReply(message: string): "yes" | "no" | "unknown" {
  const upper = message.trim().toUpperCase();
  if (upper === "YES" || upper === "NDIO") return "yes";
  if (upper === "NO"  || upper === "HAPANA") return "no";
  return "unknown";
}
