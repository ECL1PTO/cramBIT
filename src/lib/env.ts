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
  OPENROUTER_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),

  // Optional OpenAI-compatible gateway (OmniRoute / LiteLLM / a paid OpenRouter
  // model). When set, the engine sends everything here and skips the built-in
  // free-provider chain.
  LLM_GATEWAY_URL: z.string().url().optional(),
  LLM_GATEWAY_KEY: z.string().optional(),
  LLM_GATEWAY_MODEL: z.string().default("auto"),
  LLM_GATEWAY_MODEL_FAST: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default("crambit.study@gmail.com"),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),

  // Razorpay — powers the fully optional "support us" contribution. cramBIT
  // itself is free for everyone; nothing here gates access.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(), // same value, exposed to checkout

  // Transactional email (support ack + thank-you). SMTP is preferred — one
  // config that also powers Supabase Auth's magic-link mail. Resend is a fallback.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(), // e.g. "cramBIT <crambit.noida@gmail.com>"
  RESEND_API_KEY: z.string().optional(),
});

// Hosts (Vercel, etc.) often materialise blank env-var rows as "" — treat those
// as "not set" so empty optionals don't fail validation.
const cleaned = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

const parsed = schema.safeParse(cleaned);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment — see logs.");
}

export const env = parsed.data;

export const razorpayConfigured = Boolean(
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET,
);
