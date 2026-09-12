import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { verifyWebhook } from "@/lib/razorpay";
import { sendThankYouEmail } from "@/lib/notify";

export const runtime = "nodejs";

// Razorpay webhook. Configure in the dashboard with event `payment.captured`
// pointing at https://<site>/api/payments/razorpay and the shared secret.
//
// cramBIT is free for everyone now — this only ever records a voluntary
// "support us" contribution. Nothing is unlocked or gated by it.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          email?: string;
          amount?: number;
          notes?: Record<string, string>;
        };
      };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id || payment.notes?.purpose !== "support") {
    // Not a support contribution created through our order route — ignore
    // rather than error, so Razorpay doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: "not-a-support-contribution" });
  }

  const db = createServiceClient();
  const { error } = await db.from("contributions").insert({
    user_id: payment.notes?.user_id || null,
    amount: Math.round((payment.amount ?? 0) / 100),
    provider: "razorpay",
    provider_ref: payment.id ?? payment.order_id,
  });
  if (error && error.code !== "23505") {
    // 23505 = unique violation on provider_ref — Razorpay retried, already recorded.
    console.error("contribution insert:", error);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  const to = payment.notes?.email || payment.email;
  if (to) {
    sendThankYouEmail(to).catch((e) => console.error("thank-you email:", e));
  }

  return NextResponse.json({ ok: true });
}
