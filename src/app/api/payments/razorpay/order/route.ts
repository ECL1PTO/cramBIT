import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { getCourse } from "@/lib/engine/data";
import { amountForPlan } from "@/data/pricing";
import { createOrder } from "@/lib/razorpay";
import { razorpayConfigured, env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["subject", "bundle"]),
  subjectCode: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  if (!razorpayConfigured) {
    return NextResponse.json({ error: "Card/UPI checkout isn't enabled yet." }, { status: 503 });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { plan, subjectCode } = parsed.data;

  // Server decides scope + amount — client input is never trusted.
  let code: string | null = null;
  if (plan === "subject") {
    const course = subjectCode ? getCourse(subjectCode) : null;
    if (!course) return NextResponse.json({ error: "Unknown subject." }, { status: 400 });
    code = course.code;
  }
  const amount = amountForPlan(plan);

  const db = createServiceClient();

  // Don't sell what they already hold.
  const { data: ents } = await db
    .from("entitlements")
    .select("scope, subject_code")
    .eq("user_id", user.id)
    .eq("active", true);
  if (ents?.some((e) => e.scope === "bundle")) {
    return NextResponse.json({ error: "You already have the season bundle." }, { status: 409 });
  }
  if (code && ents?.some((e) => e.scope === "subject" && e.subject_code === code)) {
    return NextResponse.json({ error: `${code} is already unlocked.` }, { status: 409 });
  }

  let order;
  try {
    order = await createOrder(amount, `crambit_${user.id.slice(0, 8)}_${Date.now()}`, {
      user_id: user.id,
      plan,
      subject_code: code ?? "",
    });
  } catch (err) {
    console.error("razorpay order:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }

  const { error } = await db.from("payment_claims").insert({
    user_id: user.id,
    plan,
    subject_code: code,
    amount,
    provider: "razorpay",
    provider_ref: order.id,
    upi_utr: null,
  });
  if (error && error.code !== "23505") {
    console.error("claim insert:", error);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? env.RAZORPAY_KEY_ID,
    email: user.email ?? "",
    name: plan === "bundle" ? "cramBIT — season bundle" : `cramBIT — unlock ${code}`,
  });
}
