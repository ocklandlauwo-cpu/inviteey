import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM_NAME: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().email(),
  KENOSIS_API_URL: z.string().url(),
  KENOSIS_API_KEY: z.string().min(1),
  KENOSIS_SECRET_KEY: z.string().min(1),
  KENOSIS_SENDER_ID: z.string().min(1),
  WASENDER_API_URL: z.string().url(),
  WASENDER_API_TOKEN: z.string().min(1),
  WASENDER_WEBHOOK_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  UPLOAD_DIR: z.string().min(1),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables — check .env.local");
  }
  return result.data;
}

// Only validate on server — Next.js may call this from client for NEXT_PUBLIC_ vars
export const env = typeof window === "undefined" ? validateEnv() : (process.env as unknown as Env);
