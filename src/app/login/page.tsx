"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button, Card, Container, Field } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DISCLAIMER_SHORT } from "@/data/legal";
import { pickHype } from "@/data/hype";

const ALLOWED_DOMAIN = "@bitmesra.ac.in";
// Comma-separated extra addresses allowed to sign in (test accounts, staff).
const EXTRA = (process.env.NEXT_PUBLIC_EXTRA_LOGIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function emailAllowed(email: string): boolean {
  const e = email.toLowerCase();
  return e.endsWith(ALLOWED_DOMAIN) || EXTRA.includes(e);
}

function LoginInner() {
  const supabase = createClient();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(params.get("error"));

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!emailAllowed(email)) {
      setError(`Use your college email (${ALLOWED_DOMAIN}).`);
      return;
    }
    setStatus("sending");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen">
      <Container className="flex items-center justify-between py-5 sm:py-6">
        <Wordmark size="md" />
        <ThemeToggle />
      </Container>
      <Container className="flex max-w-md flex-col justify-center py-10 sm:min-h-[70vh]">
        <p className="mb-4 font-serif text-h2 italic leading-tight text-muted">
          {pickHype("login")}
        </p>
        <Card className="glow-accent border border-border">
          {status === "sent" ? (
            <>
              <h1 className="text-h3 font-normal text-text">Check your inbox</h1>
              <p className="mt-3 text-body-sm leading-relaxed text-muted">
                We sent a sign-in link to{" "}
                <span className="font-mono text-text">{email}</span>. Open it on this
                device.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-6 text-body-sm text-muted hover:text-text"
              >
                Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="text-h3 font-normal text-text">Sign in</h1>
              <p className="mt-2 text-body-sm text-muted">
                Restricted to BIT Mesra, Noida students.
              </p>
              <form onSubmit={sendLink} className="mt-6 space-y-4">
                <Field
                  label="College email"
                  type="email"
                  required
                  autoFocus
                  placeholder={`bca10001.24${ALLOWED_DOMAIN}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error ?? undefined}
                />
                <Button type="submit" className="w-full" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Send sign-in link"}
                </Button>
              </form>
            </>
          )}
        </Card>
        <p className="mt-4 text-caption text-faint">{DISCLAIMER_SHORT}</p>
      </Container>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
