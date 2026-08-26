import fs from "fs";
import path from "path";

/* Load .env.local the same way src/workers/start.ts does, before importing sms.ts */
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value  = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/test-sms.ts <phone-number>");
    process.exit(1);
  }

  const { sendSms } = await import("../src/lib/sms");

  try {
    await sendSms({ to, message: "Invitee SMS integration test - if you received this, Kenosis/Beem is live." });
    console.log(`Sent to ${to}`);
  } catch (err: any) {
    console.error("Send failed:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Body:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

void main();
