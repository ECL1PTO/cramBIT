"use client";

import Link from "next/link";
import { Card, Container } from "@/components/ui";
import { RazorpayButton } from "@/components/razorpay-button";

const RAZORPAY = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

export default function PayPage() {
  return (
    <main className="flex min-h-screen items-center">
      <Container className="max-w-md">
        <Link href="/dashboard" className="font-mono text-body text-muted hover:text-text">
          ← dashboard
        </Link>

        <Card className="mt-6">
          <h1 className="text-h3 font-normal text-text">Support cramBIT</h1>
          <p className="mt-3 text-body-sm leading-relaxed text-muted">
            cramBIT is free for everyone and stays that way — this isn&apos;t a paywall,
            nothing is unlocked by it. If it genuinely helped, a small contribution
            goes toward keeping it running (and maybe a proper end-sem version, if this
            mid-sem run does well).
          </p>

          {RAZORPAY ? (
            <div className="mt-6">
              <RazorpayButton />
            </div>
          ) : (
            <p className="mt-6 text-body-sm text-faint">
              Support isn&apos;t enabled yet — check back later.
            </p>
          )}

          <p className="mt-5 text-caption text-faint">
            Entirely optional. No refunds needed — nothing was ever locked behind this.
          </p>
        </Card>
      </Container>
    </main>
  );
}
