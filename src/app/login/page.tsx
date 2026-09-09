"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button, Card, Container, Field } from "@/components/ui";
import { DISCLAIMER_SHORT } from "@/data/legal";

const ALLOWED_DOMAIN = "@bitmesra.ac.in";

function LoginInner() {
  const supabase = createClient();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(params.get("error"));

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
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
    <main className="flex min-h-screen items-center bg-canvas">
      <Container className="max-w-md">
        <Link href="/" className="font-mono text-body-sm text-muted hover:text-text">
          ← cramBIT
        </Link>
        <Card className="mt-6">
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
