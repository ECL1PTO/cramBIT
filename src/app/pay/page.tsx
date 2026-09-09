"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Container, Field } from "@/components/ui";
import { PRICING } from "@/data/pricing";
import { PAYMENT_NOTE } from "@/data/legal";

const VPA = process.env.NEXT_PUBLIC_UPI_VPA ?? "";

function PayInner() {
  const params = useSearchParams();
  const plan = params.get("plan") === "bundle" ? "bundle" : "subject";
  const subject = params.get("subject");
  const amount = plan === "bundle" ? PRICING.bundle : PRICING.perSubject;

  const [utr, setUtr] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const upiLink = useMemo(() => {
    const tn = plan === "bundle" ? "cramBIT bundle" : `cramBIT ${subject ?? ""}`;
    return `upi://pay?pa=${encodeURIComponent(VPA)}&pn=cramBIT&am=${amount}&cu=INR&tn=${encodeURIComponent(tn)}`;
  }, [plan, subject, amount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const res = await fetch("/api/payments/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, subjectCode: subject ?? undefined, utr }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not submit.");
      setState("idle");
      return;
    }
    setState("done");
  }

  return (
    <main className="flex min-h-screen items-center bg-canvas">
      <Container className="max-w-md">
        <Link href="/dashboard" className="font-mono text-body-sm text-muted hover:text-text">
          ← dashboard
        </Link>

        <Card className="mt-6">
          {state === "done" ? (
            <>
              <h1 className="text-h3 font-normal text-text">Payment submitted</h1>
              <p className="mt-3 text-body-sm leading-relaxed text-muted">
                Your access unlocks within a couple of hours, once we confirm the transfer.
                You’ll get an email when it’s active.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block text-body-sm text-accent hover:underline"
              >
                Back to dashboard
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-h3 font-normal text-text">
                {plan === "bundle" ? "Season bundle" : `Unlock ${subject}`}
              </h1>
              <p className="mt-1 font-mono text-h3 text-text">₹{amount}</p>

              <ol className="mt-6 space-y-3 text-body-sm text-muted">
                <li>
                  1. Pay ₹{amount} to{" "}
                  {VPA ? (
                    <span className="font-mono text-text">{VPA}</span>
                  ) : (
                    <span className="text-faint">(UPI ID not configured)</span>
                  )}
                  {VPA && (
                    <>
                      {" "}
                      —{" "}
                      <a href={upiLink} className="text-accent hover:underline">
                        open UPI app
                      </a>
                    </>
                  )}
                </li>
                <li>2. Copy the 12-digit UPI reference / UTR from your payment receipt.</li>
                <li>3. Paste it below.</li>
              </ol>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field
                  label="UPI reference / UTR"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.trim())}
                  placeholder="123456789012"
                  required
                  error={error ?? undefined}
                />
                <Button type="submit" className="w-full" disabled={state === "sending"}>
                  {state === "sending" ? "Submitting…" : "I’ve paid — submit"}
                </Button>
              </form>

              <p className="mt-4 text-caption text-faint">{PAYMENT_NOTE}</p>
            </>
          )}
        </Card>
      </Container>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <PayInner />
    </Suspense>
  );
}
