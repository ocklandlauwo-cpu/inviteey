import { Queue } from "bullmq";

const redisConnection = {
  host:                 process.env.REDIS_HOST ?? "127.0.0.1",
  port:                 parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password:             process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as unknown as null,
};

export const ecardQueue = new Queue("ecard-generation", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

export const notifQueue = new Queue("notification-dispatch", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: "exponential", delay: 3000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

export interface EcardJobData {
  ecardId:    number;
  eventId:    number;
  inviteeId:  number;
  templateId: number;
}

export interface NotifJobData {
  notificationId: number;
  inviteeId:      number;
  channel:        "sms" | "whatsapp" | "email";
  recipientId:    number;
}
