import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { verifyWebhook } from "@/lib/razorpay";
import { sendActivationEmail } from "@/lib/notify";

export const runtime = "nodejs";

// Razorpay webhook. Configure in the dashboard with event `payment.captured`
// pointing at https://<site>/api/payments/razorpay and the shared secret.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; email?: string; notes?: Record<string, string> } } };
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
  const orderId = payment?.order_id;
  if (!orderId) return NextResponse.json({ error: "no order_id" }, { status: 400 });

  const db = createServiceClient();
  const { data: claim } = await db
    .from("payment_claims")
    .select("id, status, user_id, plan, subject_code")
    .eq("provider_ref", orderId)
    .maybeSingle();

  if (!claim) {
    // Order not created through our route — ignore rather than error (keeps
    // Razorpay from retrying forever).
    return NextResponse.json({ ok: true, unmatched: true });
  }
  if (claim.status === "approved") {
    return NextResponse.json({ ok: true, already: true }); // idempotent
  }

  const { error } = await db
    .from("payment_claims")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewer: "razorpay" })
    .eq("id", claim.id)
    .eq("status", "pending");
  if (error) {
    console.error("razorpay approve:", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
  // The grant_entitlement_on_approval trigger has now created the entitlement.

  const scope = claim.plan === "bundle" ? "the season bundle" : (claim.subject_code ?? "your subject");
  const to = payment?.notes?.email || payment?.email;
  if (to) {
    sendActivationEmail(to, scope).catch((e) => console.error("activation email:", e));
  }

  return NextResponse.json({ ok: true });
}
