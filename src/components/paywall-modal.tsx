"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { PRICING } from "@/data/pricing";
import { PAYMENT_NOTE } from "@/data/legal";

export function PaywallModal({
  courseCode,
  onClose,
}: {
  courseCode: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/80 p-6 no-print"
      onClick={onClose}
    >
      <Card className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-h3 font-normal text-ivory">You’ve used your free paper</h2>
        <p className="mt-2 text-body-sm text-ash">
          Unlock more subjects to keep predicting.
        </p>

        <div className="mt-6 space-y-3">
          {courseCode && (
            <PlanRow
              title={`Just ${courseCode}`}
              price={`₹${PRICING.perSubject}`}
              href={`/pay?plan=subject&subject=${encodeURIComponent(courseCode)}`}
            />
          )}
          <PlanRow
            title="Every subject this season"
            price={`₹${PRICING.bundle}`}
            href="/pay?plan=bundle"
            highlight
          />
        </div>

        <p className="mt-5 text-caption text-faint">{PAYMENT_NOTE}</p>
        <button
          onClick={onClose}
          className="mt-4 text-body-sm text-ash hover:text-ivory"
        >
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
          ? "border-cobalt bg-cobalt/10 text-ivory"
          : "border-hairline text-ash hover:border-ivory/40"
      }`}
    >
      <span>{title}</span>
      <span className="font-mono">{price}</span>
    </Link>
  );
}
