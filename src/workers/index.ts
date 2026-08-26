import { startEcardWorker }        from "./ecard-worker";
import { startNotificationWorker } from "./notification-worker";

console.log("[workers] Starting Invitee background workers…");

const ecardWorker = startEcardWorker();
const notifWorker = startNotificationWorker();

/* Graceful shutdown */
async function shutdown() {
  console.log("[workers] Shutting down…");
  await Promise.all([ecardWorker.close(), notifWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);

console.log("[workers] Workers started: ecard-generation, notification-dispatch");
