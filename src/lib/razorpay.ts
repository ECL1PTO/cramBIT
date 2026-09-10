import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const API = "https://api.razorpay.com/v1";

function auth(): string {
  return "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
}

/** Create an order. `amountRupees` is server-computed; notes ride through to the webhook. */
export async function createOrder(
  amountRupees: number,
  receipt: string,
  notes: Record<string, string>,
): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });
  if (!res.ok) {
    throw new Error(`razorpay order failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

/** Verify the `X-Razorpay-Signature` header on a webhook body. */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
