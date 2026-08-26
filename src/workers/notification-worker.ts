import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";

const redisConnection = {
  host:                 process.env.REDIS_HOST ?? "127.0.0.1",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as unknown as null,
};
import { sendSms }       from "@/lib/sms";
import { sendWhatsApp }  from "@/lib/whatsapp";
import { sendEmail }     from "@/lib/email";
import { renderTemplate } from "@/lib/notification-template";
import type { NotifJobData } from "./queues";

async function processNotification(job: Job<NotifJobData>) {
  const { notificationId, inviteeId, channel, recipientId } = job.data;

  const [notification, invitee] = await Promise.all([
    prisma.notification.findUnique({ where: { id: notificationId }, include: { event: true } }),
    prisma.invitee.findUnique({ where: { id: inviteeId } }),
  ]);

  if (!notification || !invitee) {
    throw new Error(`Missing data: notification=${!!notification} invitee=${!!invitee}`);
  }

  await prisma.notificationRecipient.update({
    where: { id: recipientId },
    data:  { status: "pending" },
  });

  const context = {
    name:      invitee.name,
    date:      notification.event.eventDate,
    venue:     notification.event.venueName,
    rsvpToken: invitee.qrToken,
  };
  const message = renderTemplate(notification.message, context);
  const subject = notification.subject ? renderTemplate(notification.subject, context) : "Message from Invitee";

  try {
    if (channel === "sms") {
      if (!invitee.phone) throw new Error("No phone number for invitee");
      await sendSms({ to: invitee.phone, message });

    } else if (channel === "whatsapp") {
      if (!invitee.phone) throw new Error("No phone number for invitee");
      await sendWhatsApp({ to: invitee.phone, message });

    } else if (channel === "email") {
      if (!invitee.email) throw new Error("No email for invitee");
      await sendEmail({ to: invitee.email, subject, html: `<p>${message}</p>` });
    }

    await prisma.notificationRecipient.update({
      where: { id: recipientId },
      data:  { status: "delivered", sentAt: new Date(), deliveredAt: new Date() },
    });

    console.log(`[notif-worker] Sent ${channel} to invitee ${inviteeId}`);
    await finalizeNotificationStatus(notificationId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.notificationRecipient.update({
      where: { id: recipientId },
      data:  { status: "failed", errorMessage: msg },
    });
    await finalizeNotificationStatus(notificationId);
    throw err;
  }
}

/* Once every recipient has reached a terminal state, mark the notification completed/failed */
async function finalizeNotificationStatus(notificationId: number) {
  const recipients = await prisma.notificationRecipient.findMany({
    where:  { notificationId },
    select: { status: true },
  });

  const allDone = recipients.every(r => r.status === "delivered" || r.status === "failed");
  if (!allDone) return;

  const allFailed = recipients.every(r => r.status === "failed");

  await prisma.notification.update({
    where: { id: notificationId },
    data:  { status: allFailed ? "failed" : "completed" },
  });
}

export function startNotificationWorker() {
  const worker = new Worker<NotifJobData>("notification-dispatch", processNotification, {
    connection: redisConnection,
    concurrency: 5,
  });

  worker.on("completed", job => console.log(`[notif-worker] Job ${job.id} completed`));
  worker.on("failed",    (job, err) => console.error(`[notif-worker] Job ${job?.id} failed:`, err.message));

  return worker;
}
