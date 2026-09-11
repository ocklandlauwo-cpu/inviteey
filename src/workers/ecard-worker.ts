import { Worker, type Job } from "bullmq";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { generateEcardBuffer, type EcardTextField } from "@/lib/ecard-generator";
import type { EcardJobData } from "./queues";

const redisConnection = {
  host:                 process.env.REDIS_HOST ?? "127.0.0.1",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as unknown as null,
};

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz";

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

  const outputDir = path.resolve(UPLOADS_DIR, "ecards");
  await fs.mkdir(outputDir, { recursive: true });

  const outputFilename = `ecard_${ecardId}_${inviteeId}.jpg`;
  const outputPath     = path.join(outputDir, outputFilename);

  const buffer = await generateEcardBuffer({
    templateImagePath: template.imagePath,
    qrPosition:         template.qrPosition as { x?: number; y?: number; size?: number } | null,
    qrEnabled:          template.qrEnabled,
    textFields:         template.textFields as EcardTextField[] | null,
    qrUrl:              `${APP_URL}/scan/${invitee.qrToken}`,
    invitee:            { name: invitee.name, category: invitee.category },
    event:              invitee.event,
  });

  await fs.writeFile(outputPath, buffer);

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
