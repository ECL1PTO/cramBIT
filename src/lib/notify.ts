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

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const from = env.SMTP_FROM ?? "cramBIT <onboarding@resend.dev>";
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const port = env.SMTP_PORT ?? 587;
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      });
      await transport.sendMail({ from, ...opts });
      return;
    } catch (err) {
      console.error("SMTP send failed:", err);
    }
  }
  if (env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...opts }),
    }).catch(() => {});
  }
}

function shell(heading: string, body: string, cta?: { href: string; label: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f3f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="100%" style="max-width:440px;background:#fff;border:1px solid #e7e5e0;border-radius:14px">
      <tr><td style="padding:28px 28px 0"><div style="font-family:ui-monospace,Menlo,monospace;font-weight:600;font-size:18px;color:#191a1f">cram<span style="color:#4f46e5">BIT</span></div></td></tr>
      <tr><td style="padding:18px 28px 4px"><h1 style="margin:0;font-size:20px;font-weight:600;color:#191a1f">${heading}</h1>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#5c5d68">${body}</p></td></tr>
      ${cta ? `<tr><td style="padding:20px 28px 28px"><a href="${cta.href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:9999px">${cta.label}</a></td></tr>` : `<tr><td style="height:20px"></td></tr>`}
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #e7e5e0"><p style="margin:0;font-size:12px;line-height:1.5;color:#9a9aa4">Predictions are estimates with no accuracy guarantee. cramBIT is an independent student tool, not affiliated with BIT Mesra.</p></td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export async function sendSupportAck(to: string): Promise<void> {
  await sendMail({
    to,
    subject: "We got your message — cramBIT",
    text: `Thanks for reaching out. Your message is with us and we'll get back to you soon. — cramBIT`,
    html: shell(
      "We've got you",
      "Thanks for flagging it. Your message is in our inbox and a human will get back to you soon — usually within a day. If it's about a prediction that was way off, tell us the course code and we'll take a look.",
    ),
  });
}

export async function notifyAdminOfSupport(fromEmail: string, message: string): Promise<void> {
  const text = `📮 *Support message*\nFrom: ${fromEmail}\n\n${message.slice(0, 1500)}`;
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    }).catch(() => {});
  }
  await sendMail({
    to: env.NEXT_PUBLIC_SUPPORT_EMAIL,
    subject: `cramBIT support — ${fromEmail}`,
    text: `From: ${fromEmail}\n\n${message}`,
    html: shell("New support message", `<b>From:</b> ${fromEmail}<br/><br/>${message.replace(/\n/g, "<br/>")}`),
  });
}

export async function sendActivationEmail(to: string, scope: string): Promise<void> {
  await sendMail({
    to,
    subject: "Your cramBIT access is active",
    text:
      `Your payment is confirmed and your ${scope} access is now active.\n\n` +
      `Open ${env.NEXT_PUBLIC_SITE_URL}/dashboard and generate away.\n\n— cramBIT`,
    html: shell(
      "Your access is active",
      `We've confirmed your payment. Your <b>${scope}</b> is unlocked — your predicted papers are ready.`,
      { href: `${env.NEXT_PUBLIC_SITE_URL}/dashboard`, label: "Open cramBIT →" },
    ),
  });
}
