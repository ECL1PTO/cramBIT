"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { MIN_SUPPORT_AMOUNT, MAX_SUPPORT_AMOUNT } from "@/data/pricing";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** A "support us" button — cramBIT is free for everyone, this is optional. */
export function RazorpayButton() {
  const [amount, setAmount] = useState("49");
  const [state, setState] = useState<"idle" | "loading" | "paying" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const n = Number(amount);
  const validAmount = Number.isFinite(n) && n >= MIN_SUPPORT_AMOUNT && n <= MAX_SUPPORT_AMOUNT;

  async function pay() {
    setError(null);
    if (!validAmount) {
      setError(`Enter an amount between ₹${MIN_SUPPORT_AMOUNT} and ₹${MAX_SUPPORT_AMOUNT}.`);
      return;
    }
    setState("loading");
    try {
      const ok = await loadScript();
      if (!ok || !window.Razorpay) throw new Error("Checkout failed to load. Check your connection.");

      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Could not start checkout.");

      setState("paying");
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "cramBIT",
        description: "Support cramBIT",
        prefill: { email: order.email },
        theme: { color: "#5b6ef5" },
        handler: () => setState("done"),
        modal: { ondismiss: () => setState("idle") },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-input border border-accent/40 bg-accent-soft px-4 py-3 text-body-sm text-text">
        Received — genuinely, thank you. 🙏
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field
        label="Amount (₹) — whatever feels right"
        type="number"
        min={MIN_SUPPORT_AMOUNT}
        max={MAX_SUPPORT_AMOUNT}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button onClick={pay} disabled={state !== "idle"} className="w-full">
        {state === "loading" ? "Starting…" : state === "paying" ? "Complete the payment…" : "Support cramBIT"}
      </Button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
