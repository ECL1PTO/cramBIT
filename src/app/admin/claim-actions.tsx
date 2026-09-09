"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    await fetch("/api/payments/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, decision }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => decide("approved")}
        disabled={busy}
        className="rounded-pill bg-accent px-4 py-1.5 text-body-sm text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => decide("rejected")}
        disabled={busy}
        className="rounded-pill border border-border px-4 py-1.5 text-body-sm text-muted disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
