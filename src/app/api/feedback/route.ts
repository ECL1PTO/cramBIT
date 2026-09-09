import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["accuracy", "general"]).default("general"),
  rating: z.enum(["nailed", "close", "off"]).optional(),
  subjectCode: z.string().max(20).optional(),
  message: z.string().max(4000).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.rating && !parsed.data.message?.trim())) {
    return NextResponse.json({ error: "Say a little more." }, { status: 400 });
  }
  const { kind, rating, subjectCode, message } = parsed.data;

  const db = createServiceClient();
  const { error } = await db.from("feedback").insert({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    kind,
    rating: rating ?? null,
    subject_code: subjectCode ?? null,
    message: message?.trim() || null,
  });
  if (error) console.error("feedback insert failed (run the migration?):", error.message);

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID) {
    const text =
      `🗣️ *Feedback* (${kind}${rating ? ` · ${rating}` : ""})\n` +
      `${user?.email ?? "anon"}${subjectCode ? ` · ${subjectCode}` : ""}\n` +
      (message ? `\n${message.slice(0, 1200)}` : "");
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: "Markdown" }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
