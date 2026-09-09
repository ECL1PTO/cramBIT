import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createServiceClient } from "@/utils/supabase/service";
import { applyDecision } from "@/lib/payments";
import { answerTelegramCallback } from "@/lib/notify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    req.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const cb = update?.callback_query;
  if (!cb?.data) return NextResponse.json({ ok: true });

  const fromId = String(cb.from?.id ?? "");
  if (env.TELEGRAM_ADMIN_CHAT_ID && fromId !== env.TELEGRAM_ADMIN_CHAT_ID) {
    await answerTelegramCallback(cb.id, "Not authorised.");
    return NextResponse.json({ ok: true });
  }

  const [action, claimId] = String(cb.data).split(":");
  const decision = action === "approve" ? "approved" : "rejected";

  const db = createServiceClient();
  const result = await applyDecision(db, claimId, decision, `telegram:${fromId}`);
  await answerTelegramCallback(cb.id, result.message);

  return NextResponse.json({ ok: true });
}
