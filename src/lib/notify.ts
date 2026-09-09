import "server-only";
import { env } from "@/lib/env";

interface ClaimNotice {
  claimId: string;
  email: string;
  plan: string;
  subjectCode: string | null;
  amount: number;
  utr: string;
}

/** Sends the admin a Telegram message with inline Approve / Reject buttons. */
export async function notifyAdminOfClaim(c: ClaimNotice): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;

  const text =
    `💸 *Payment claim*\n` +
    `Student: ${c.email}\n` +
    `Plan: ${c.plan}${c.subjectCode ? ` (${c.subjectCode})` : ""}\n` +
    `Expected: ₹${c.amount}\n` +
    `UTR: \`${c.utr}\`\n\n` +
    `Verify the credit in your UPI app, then:`;

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
      text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve:${c.claimId}` },
            { text: "❌ Reject", callback_data: `reject:${c.claimId}` },
          ],
        ],
      },
    }),
  }).catch(() => {});
}

export async function answerTelegramCallback(
  callbackId: string,
  text: string,
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text }),
    },
  ).catch(() => {});
}

export async function sendActivationEmail(to: string, scope: string): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "cramBIT <onboarding@resend.dev>",
      to,
      subject: "Your cramBIT access is active",
      text:
        `Your payment is confirmed and your ${scope} access is now active.\n\n` +
        `Open ${env.NEXT_PUBLIC_SITE_URL}/dashboard and generate away.\n\n— cramBIT`,
    }),
  }).catch(() => {});
}
