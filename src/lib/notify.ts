import "server-only";
import { env } from "@/lib/env";

/** Fire-and-forget ping when a student completes a magic-link sign-in. */
export async function notifyAdminOfLogin(email: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
      text: `👤 Login: ${email}`,
    }),
  }).catch(() => {});
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

/** cramBIT is free for everyone — this just thanks a voluntary supporter. */
export async function sendThankYouEmail(to: string): Promise<void> {
  await sendMail({
    to,
    subject: "Thank you for supporting cramBIT",
    text:
      `Genuinely, thank you — cramBIT is free for everyone and stays that way; ` +
      `your support just helps keep it running and improving.\n\n— cramBIT`,
    html: shell(
      "Thank you 🙏",
      `Genuinely, thank you for chipping in. cramBIT is free for everyone and stays that way — your support just helps keep it running (and pushes it further, like a proper end-sem version).`,
      { href: `${env.NEXT_PUBLIC_SITE_URL}/dashboard`, label: "Open cramBIT →" },
    ),
  });
}
