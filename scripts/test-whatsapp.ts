import fs from "fs";
import path from "path";

/* Load .env.local the same way src/workers/start.ts does, before importing whatsapp.ts */
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
    console.error("Usage: npx tsx scripts/test-whatsapp.ts <phone-number>");
    process.exit(1);
  }

  const { sendWhatsApp } = await import("../src/lib/whatsapp");

  const result = await sendWhatsApp({
    to,
    message: "Invitee WhatsApp integration test - if you received this, WaSender is live.",
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.auto) {
    console.log("\nNote: this fell back to a deep link, meaning WASENDER_API_KEY isn't live yet.");
  }
}

void main();
