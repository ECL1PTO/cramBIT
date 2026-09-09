"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "redacted@example.com";

export function SupportForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't send. Email us directly.");
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <p className="fade-in text-body-sm leading-relaxed text-muted">
        Got it. We&apos;ve sent a confirmation to{" "}
        <span className="font-mono text-text">{email}</span> and a human will get back to
        you soon.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Your email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@bitmesra.ac.in"
        error={error ?? undefined}
      />
      <label className="block">
        <span className="mb-2 block text-body-sm text-muted">What went wrong?</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A prediction was way off / the site broke / payment issue…"
          className="min-h-32 w-full resize-y rounded-input border border-border bg-surface-2 px-4 py-3 text-body-sm text-text placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </label>
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </Button>
      <p className="text-caption text-faint">
        Prefer email? Write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        — you&apos;ll get an auto-reply, then a real one.
      </p>
    </form>
  );
}
