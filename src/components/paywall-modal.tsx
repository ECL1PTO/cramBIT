"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { PRICING } from "@/data/pricing";
import { PAYMENT_NOTE } from "@/data/legal";

export function PaywallModal({
  courseCode,
  locked,
  reason,
  onClose,
}: {
  courseCode: string | null;
  locked?: string | null;
  reason?: string;
  onClose: () => void;
}) {
  const capReached = reason === "regen-cap";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6 no-print"
      onClick={onClose}
    >
      <Card
        className="glow-accent max-w-md border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-h3 font-normal text-text">
          {capReached
            ? "You've used all your tries for this subject"
            : locked
              ? "Your plan is locked to another subject"
              : "You've used your free subject"}
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-muted">
          {locked && !capReached ? (
            <>
              Free predictions are tied to{" "}
              <span className="font-mono text-text">{locked}</span> — the first course you
              generated for. To predict{" "}
              <span className="font-mono text-text">{courseCode ?? "another subject"}</span>,
              unlock it below.
            </>
          ) : (
            <>
              You&apos;ve had your free run — sit the exam, see how close it landed, then come
              back for the rest.
            </>
          )}
        </p>

        <div className="mt-6 space-y-3">
          {courseCode && (
            <PlanRow
              title={`Unlock ${courseCode}`}
              price={`₹${PRICING.perSubject}`}
              href={`/pay?plan=subject&subject=${encodeURIComponent(courseCode)}`}
            />
          )}
          <PlanRow
            title="All 5 subjects — season bundle"
            price={`₹${PRICING.bundle}`}
            href="/pay?plan=bundle"
            highlight
          />
        </div>

        <p className="mt-5 text-caption text-faint">{PAYMENT_NOTE}</p>
        <button onClick={onClose} className="mt-4 text-body-sm text-muted hover:text-text">
          Not now
        </button>
      </Card>
    </div>
  );
}

function PlanRow({
  title,
  price,
  href,
  highlight,
}: {
  title: string;
  price: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-input border px-4 py-3 text-body-sm transition-colors ${
        highlight
          ? "border-accent bg-accent-soft text-text"
          : "border-border text-muted hover:border-accent/50"
      }`}
    >
      <span>{title}</span>
      <span className="font-mono">{price}</span>
    </Link>
  );
}
