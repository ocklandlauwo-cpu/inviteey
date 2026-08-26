import axios from "axios";

interface SendSmsOptions {
  to:      string;
  message: string;
}

/** Normalise TZ phone numbers to the digits-only MSISDN format Kenosis/Beem expects (2557XXXXXXXX) */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return digits;
  if (digits.startsWith("0")   && digits.length === 10) return `255${digits.slice(1)}`;
  if (digits.startsWith("7")   && digits.length === 9)  return `255${digits}`;
  return digits;
}

/** Plain ASCII is always safe as GSM 7-bit; anything else (emoji, curly quotes, em dash, accents) needs UCS2 */
function needsUnicode(message: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/^[\x00-\x7F]*$/.test(message);
}

export async function sendSms({ to, message }: SendSmsOptions): Promise<void> {
  const apiKey    = process.env.KENOSIS_API_KEY;
  const secretKey = process.env.KENOSIS_SECRET_KEY;
  const apiUrl    = process.env.KENOSIS_API_URL;
  const senderId  = process.env.KENOSIS_SENDER_ID;

  const isLive = !!apiKey && apiKey !== "mock-kenosis-key" && !!secretKey && !!apiUrl;

  if (!isLive) {
    console.log(`[SMS MOCK] To: ${to}\nMessage: ${message}`);
    return;
  }

  const dest = normalisePhone(to);
  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");

  const { data } = await axios.post(
    apiUrl,
    {
      source_addr: senderId,
      encoding:    needsUnicode(message) ? 8 : 0,
      message,
      recipients:  [{ recipient_id: dest, dest_addr: dest }],
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (data?.successful === false) {
    throw new Error(`Kenosis SMS send failed: ${data?.message ?? JSON.stringify(data)}`);
  }
}
