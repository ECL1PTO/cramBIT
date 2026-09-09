"use client";

import { useState } from "react";

type Rating = "nailed" | "close" | "off";

export function FeedbackBar({ subjectCode }: { subjectCode?: string | null }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function send(r: Rating, withNote = false) {
    setRating(r);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "accuracy",
        rating: r,
        subjectCode: subjectCode ?? undefined,
        message: withNote ? note.trim() || undefined : undefined,
      }),
    }).catch(() => {});
    if (withNote) setSent(true);
  }

  if (sent) {
    return (
      <p className="fade-in text-caption text-faint no-print">
        Thanks — feedback logged. It helps the engine get sharper.
      </p>
    );
  }

  return (
    <div className="fade-in space-y-2 no-print">
      <div className="flex flex-wrap items-center gap-2 text-caption text-muted">
        <span>Sat the exam? How close was this —</span>
        {(
          [
            ["nailed", "nailed it"],
            ["close", "close"],
            ["off", "way off"],
          ] as const
        ).map(([r, label]) => (
          <button
            key={r}
            onClick={() => send(r)}
            className={`rounded-pill border px-3 py-1 transition-colors ${
              rating === r
                ? "border-accent bg-accent-soft text-text"
                : "border-border hover:border-accent/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {rating && (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did it get right / miss? (optional)"
            className="flex-1 rounded-input border border-border bg-surface-2 px-3 py-2 text-caption text-text placeholder:text-faint focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => send(rating, true)}
            className="rounded-pill bg-accent px-4 py-2 text-caption font-medium text-white"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
