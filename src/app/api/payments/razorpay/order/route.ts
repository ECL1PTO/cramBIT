import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createOrder } from "@/lib/razorpay";
import { razorpayConfigured, env } from "@/lib/env";
import { MIN_SUPPORT_AMOUNT, MAX_SUPPORT_AMOUNT } from "@/data/pricing";

export const runtime = "nodejs";

// cramBIT is free for everyone — this is a voluntary "support us" contribution
// only. The amount is whatever the user chooses; the only thing enforced
// server-side is that it's a sane positive number, not a scope/plan.
const Body = z.object({
  amount: z.number().positive().min(MIN_SUPPORT_AMOUNT).max(MAX_SUPPORT_AMOUNT),
});

export async function POST(req: Request) {
  if (!razorpayConfigured) {
    return NextResponse.json({ error: "Checkout isn't enabled yet." }, { status: 503 });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Enter an amount between ₹${MIN_SUPPORT_AMOUNT} and ₹${MAX_SUPPORT_AMOUNT}.` },
      { status: 400 },
    );
  }
  const { amount } = parsed.data;

  let order;
  try {
    order = await createOrder(amount, `crambit_support_${user.id.slice(0, 8)}_${Date.now()}`, {
      user_id: user.id,
      purpose: "support",
    });
  } catch (err) {
    console.error("razorpay order:", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? env.RAZORPAY_KEY_ID,
    email: user.email ?? "",
  });
}
