"use client";

import { useState } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cram-bit.vercel.app";

export function ShareButton({
  text,
  className,
  label = "Share",
  compact = false,
}: {
  text: string;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const fullText = `${text}\n${SITE_URL}`;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Everything in one `text` field, nothing in a separate `url` —
        // WhatsApp's Android share target sometimes drops the accompanying
        // text and shows only the url when they're passed separately.
        await navigator.share({ text: fullText });
        return;
      } catch {
        // user cancelled the native sheet — fall through to nothing further
        return;
      }
    }
    // Desktop fallback: open WhatsApp Web with the message pre-filled.
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — WhatsApp button still works */
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        onClick={share}
        className="rounded-pill border border-border px-4 py-1.5 text-body-sm text-muted transition-[color,border-color,transform,opacity] duration-150 hover:border-accent/50 hover:text-text active:scale-[0.96] active:opacity-80"
      >
        {label}
      </button>
      {!compact && (
        <button
          onClick={copyLink}
          title="Copy link"
          className="rounded-pill border border-border px-3 py-1.5 text-body-sm text-muted transition-[color,border-color,transform,opacity] duration-150 hover:border-accent/50 hover:text-text active:scale-[0.96] active:opacity-80"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      )}
    </div>
  );
}
