"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

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

export function RazorpayButton({
  plan,
  subjectCode,
  label,
}: {
  plan: "subject" | "bundle";
  subjectCode?: string | null;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "paying" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setState("loading");
    try {
      const ok = await loadScript();
      if (!ok || !window.Razorpay) throw new Error("Checkout failed to load. Check your connection.");

      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, subjectCode: subjectCode ?? undefined }),
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
        description: order.name,
        prefill: { email: order.email },
        theme: { color: "#5b6ef5" },
        handler: () => {
          // The payment.captured webhook grants the entitlement — it usually
          // lands within a second or two. Send them back to generate.
          setState("done");
        },
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
        Payment received. Your access unlocks in a few seconds —{" "}
        <a href="/dashboard" className="text-accent underline">
          back to dashboard
        </a>
        .
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={pay} disabled={state !== "idle"} className="w-full">
        {state === "loading" ? "Starting…" : state === "paying" ? "Complete the payment…" : label}
      </Button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
