import axios from "axios";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

export type WhatsAppVendor = "wasender" | "authkey";

interface SendWhatsAppOptions {
  to:        string;
  message:   string;
  imageUrl?: string;
  vendor?:   WhatsAppVendor; // defaults to "wasender"
  /** AuthKey only — the registered template's `wid`. Falls back to AUTHKEY_WHATSAPP_TEMPLATE_ID if omitted. */
  authkeyTemplateId?:     string;
  /** AuthKey only — whether the chosen template has an image header (attaches imageUrl there). */
  authkeyHasImageHeader?: boolean;
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

/** Split an E.164 number into AuthKey's separate country_code / mobile fields. */
function splitForAuthkey(e164: string): { countryCode: string; mobile: string } {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) {
    return { countryCode: "255", mobile: digits.slice(3) };
  }
  return { countryCode: digits.slice(0, -9), mobile: digits.slice(-9) };
}

/** Attempt a send via WaSender. Returns null when unconfigured (caller falls back to deep link). */
async function sendWhatsAppViaWasender({ to, message, imageUrl }: SendWhatsAppOptions): Promise<WhatsAppSendResult | null> {
  const token  = process.env.WASENDER_API_KEY;
  const apiUrl = process.env.WASENDER_API_URL;

  if (!token || token === "mock-wasender-token" || !apiUrl) return null;

  try {
    const payload = imageUrl
      ? { to, text: message, imageUrl }
      : { to, text: message };

    const { data } = await axios.post(`${apiUrl}/send-message`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (data?.success === false) {
      console.error("[whatsapp] WaSender rejected send:", data);
      return null;
    }
    return { success: true, auto: true };
  } catch (e) {
    console.error("[whatsapp] WaSender error:", e);
    return null;
  }
}

/**
 * Attempt a send via AuthKey (console.authkey.io) WhatsApp Business API.
 *
 * AuthKey requires an approved WhatsApp template (`wid`) — free-form text
 * cannot be sent on the official Business API. The template configured via
 * AUTHKEY_WHATSAPP_TEMPLATE_ID must be built with a single body variable
 * ({{1}}) so the full pre-formatted invitation text (identical to what
 * WaSender would send) can be passed straight through as `bodyValues.var1`.
 * If the template also has an IMAGE header, the e-card image is passed via
 * `headerValues.headerData`; omit the header on the template if not needed.
 *
 * Returns null when unconfigured (caller falls back to deep link).
 */
async function sendWhatsAppViaAuthkey({
  to, message, imageUrl, authkeyTemplateId, authkeyHasImageHeader,
}: SendWhatsAppOptions): Promise<WhatsAppSendResult | null> {
  const apiKey     = process.env.AUTHKEY_API_KEY;
  const apiUrl     = process.env.AUTHKEY_API_URL ?? "https://console.authkey.io/restapi/requestjson.php";
  const templateId = authkeyTemplateId || process.env.AUTHKEY_WHATSAPP_TEMPLATE_ID;

  if (!apiKey || apiKey === "mock-authkey-token" || !templateId) return null;

  try {
    const { countryCode, mobile } = splitForAuthkey(normalisePhone(to));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      country_code: countryCode,
      mobile,
      wid:          templateId,
      type:         "text",
      bodyValues:   { var1: message },
    };
    if (imageUrl && authkeyHasImageHeader) {
      payload.headerValues = { headerData: imageUrl };
    }

    const { data } = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const failed = data?.Status === "Error" || data?.status === "error" || data?.success === false;
    if (failed) {
      console.error("[whatsapp] AuthKey rejected send:", data);
      return null;
    }
    return { success: true, auto: true };
  } catch (e) {
    console.error("[whatsapp] AuthKey error:", e);
    return null;
  }
}

/**
 * Send a WhatsApp message via the selected vendor (WaSender or AuthKey).
 * Falls back to a wa.me deep link (manual send) when the chosen vendor
 * isn't configured or the send fails.
 */
export async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
  const { to, message, imageUrl, vendor = "wasender" } = opts;
  const result = vendor === "authkey"
    ? await sendWhatsAppViaAuthkey(opts)
    : await sendWhatsAppViaWasender({ to, message, imageUrl });

  if (result) return result;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[WHATSAPP MOCK:${vendor}] To: ${to}\nMessage: ${message}${imageUrl ? `\nImage: ${imageUrl}` : ""}`);
  }

  /* Fallback: wa.me deep link (manual send) */
  const cleanNum = normalisePhone(to).replace("+", "");
  const deepLink = `https://wa.me/${cleanNum}?text=${encodeURIComponent(message)}`;
  return { success: true, auto: false, deepLink };
}

/** Fixed option labels for the RSVP poll — shared with the webhook handler so votes match exactly. */
export const RSVP_POLL_OPTIONS = { attend: "✅ ATTEND", notAttend: "❌ NOT ATTEND" } as const;

export interface WhatsAppPollResult {
  success: boolean;
  auto:    boolean; // true = sent via API / false = polls have no deep-link fallback
}

/**
 * Send a native WhatsApp poll as a tap-to-vote RSVP (ATTEND / NOT ATTEND).
 * Requires the live WaSender API — there's no deep-link equivalent for polls,
 * so this silently no-ops (auto: false) when only mocked/unconfigured.
 */
export async function sendRsvpPoll(to: string, eventName: string): Promise<WhatsAppPollResult> {
  const token  = process.env.WASENDER_API_KEY;
  const apiUrl = process.env.WASENDER_API_URL;

  if (!token || token === "mock-wasender-token" || !apiUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[WHATSAPP MOCK] Poll to: ${to}\nWill you attend ${eventName}?`);
    }
    return { success: false, auto: false };
  }

  try {
    const { data } = await axios.post(
      `${apiUrl}/send-message`,
      {
        to,
        poll: {
          question:    `Will you attend ${eventName}?`,
          options:     [RSVP_POLL_OPTIONS.attend, RSVP_POLL_OPTIONS.notAttend],
          multiSelect: false,
        },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );

    if (data?.success === false) {
      console.error("[whatsapp] WaSender rejected poll send:", data);
      return { success: false, auto: true };
    }
    return { success: true, auto: true };
  } catch (e) {
    console.error("[whatsapp] WaSender poll error:", e);
    return { success: false, auto: true };
  }
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

/**
 * WaSender verifies webhooks via a plain shared-secret comparison in the
 * X-Webhook-Signature header — not HMAC-signed, per their docs.
 */
export function verifyWasenderWebhook(signature: string | null): boolean {
  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (!signature || !secret) return false;
  const sigBuf    = Buffer.from(signature);
  const secretBuf = Buffer.from(secret);
  if (sigBuf.length !== secretBuf.length) return false;
  return crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(secretBuf));
}

export function parseRsvpReply(message: string): "yes" | "no" | "unknown" {
  const upper = message.trim().toUpperCase();
  if (upper === "YES" || upper === "NDIO") return "yes";
  if (upper === "NO"  || upper === "HAPANA") return "no";
  return "unknown";
}
