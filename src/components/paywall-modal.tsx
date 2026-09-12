"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { FAIR_USE_SUBJECT_CAP, SUBJECT_REGEN_CAP } from "@/lib/limits";

/**
 * cramBIT is free for everyone — this is no longer a paywall, just an honest
 * "you've hit the fair-use limit" notice. Nothing here is trying to sell
 * anything; /pay is a fully optional, no-strings "support us" link.
 */
export function PaywallModal({
  courseCode,
  reason,
  onClose,
}: {
  courseCode: string | null;
  reason?: string;
  onClose: () => void;
}) {
  const subjectCapReached = reason === "subject-cap";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 backdrop-blur-sm p-6 no-print"
      onClick={onClose}
    >
      <Card
        className="glow-accent max-w-md border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-h3 font-normal text-text">
          {subjectCapReached
            ? `You've used all ${FAIR_USE_SUBJECT_CAP} subjects`
            : "You've used all your tries for this subject"}
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-muted">
          {subjectCapReached ? (
            <>
              cramBIT is free, but to keep it running for everyone each account is capped
              at {FAIR_USE_SUBJECT_CAP} different subjects this season. You&apos;ve used all{" "}
              {FAIR_USE_SUBJECT_CAP} — if that&apos;s genuinely not enough, message support
              and we&apos;ll see what we can do.
            </>
          ) : (
            <>
              Each subject is capped at {SUBJECT_REGEN_CAP} regenerations so the free
              infra behind this holds up for everyone.{" "}
              {courseCode && (
                <>
                  You&apos;ve used all {SUBJECT_REGEN_CAP} for{" "}
                  <span className="font-mono text-text">{courseCode}</span>.
                </>
              )}
            </>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/support"
            className="rounded-input border border-border px-4 py-3 text-center text-body-sm text-text hover:border-accent/50"
          >
            Contact support
          </Link>
          <Link
            href="/pay"
            className="rounded-input border border-accent bg-accent-soft px-4 py-3 text-center text-body-sm text-text hover:border-accent"
          >
            Enjoying it? Support cramBIT →
          </Link>
        </div>

        <button onClick={onClose} className="mt-4 text-body-sm text-muted hover:text-text">
          Not now
        </button>
      </Card>
    </div>
  );
}
