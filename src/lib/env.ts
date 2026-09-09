import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Import this instead of touching process.env directly.
 * Throws at module load if anything required is missing.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1), // last-resort fallback + PDF pipeline
  GROQ_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(), // preferred: highest free limits

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_UPI_VPA: z.string().min(3).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default("redacted@example.com"),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Transactional email (payment activation). SMTP is preferred — one config
  // that also powers Supabase Auth's magic-link mail. Resend API is a fallback.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(), // e.g. "cramBIT <crambit.noida@gmail.com>"
  RESEND_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment — see logs.");
}

export const env = parsed.data;

export const paymentsConfigured = Boolean(
  env.NEXT_PUBLIC_UPI_VPA &&
    env.TELEGRAM_BOT_TOKEN &&
    env.TELEGRAM_ADMIN_CHAT_ID &&
    env.TELEGRAM_WEBHOOK_SECRET,
);
