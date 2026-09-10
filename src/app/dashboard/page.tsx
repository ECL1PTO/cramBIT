"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "markdown-to-jsx";
import { createClient } from "@/utils/supabase/client";
import { Button, Card, Container, MonoChip, TextArea } from "@/components/ui";
import { DISCLAIMER_ACK } from "@/data/legal";
import { pickHype } from "@/data/hype";
import { PaywallModal } from "@/components/paywall-modal";
import { FeedbackBar } from "@/components/feedback-bar";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

type Phase = "idle" | "planning" | "pooling" | "writing" | "done";
interface Suggestion {
  code: string;
  name: string;
  semester: number | null;
  grounding: string;
}

const STEP_COPY: Record<"planning" | "pooling" | "writing", string> = {
  planning: "Reading PYQs, building the topic blueprint…",
  pooling: "Ranking the most probable questions…",
  writing: "Drafting and checking the papers…",
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [ackedAt, setAckedAt] = useState<string | null>(null);

  const [courseInput, setCourseInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [syllabus, setSyllabus] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<string | null>(null);
  const [borrowedFrom, setBorrowedFrom] = useState<string[]>([]);
  const [sets, setSets] = useState<string[]>([]);
  const [activeSet, setActiveSet] = useState(0);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [triesLeft, setTriesLeft] = useState<number | null>(null);
  const [papersRead, setPapersRead] = useState(0);
  const [scanned, setScanned] = useState(0);

  const [paywall, setPaywall] = useState<
    null | { code: string | null; locked?: string | null; reason?: string }
  >(null);
  const [needAck, setNeedAck] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push("/login");
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("disclaimer_ack_at")
        .eq("id", data.user.id)
        .single();
      setAckedAt(profile?.disclaimer_ack_at ?? null);
    });
  }, [router, supabase]);

  // course autocomplete
  useEffect(() => {
    const q = courseInput.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setSuggestions(json.results ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [courseInput]);

  async function ackDisclaimer() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ disclaimer_ack_at: now }).eq("id", data.user.id);
    setAckedAt(now);
    setNeedAck(false);
  }

  const run = useCallback(async () => {
    setError(null);
    if (!courseInput.trim()) return setError("Enter your course code.");
    if (!ackedAt) return setNeedAck(true);

    setPhase("planning");
    setSets([]);
    setActiveSet(0);
    setPapersRead(0);
    setScanned(0);

    // A minimum visible duration per phase so it's clear the engine is actually
    // working through the papers, not faking it.
    const hold = (start: number, ms: number) =>
      new Promise<void>((res) => setTimeout(res, Math.max(0, ms - (Date.now() - start))));

    try {
      const t0 = Date.now();
      const planRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "plan", courseInput, syllabus }),
      });
      const plan = await planRes.json();
      if (planRes.ok && plan.papersRead) {
        setPapersRead(plan.papersRead);
        await hold(t0, Math.min(4500, 1600 + plan.papersRead * 150));
      }

      if (planRes.status === 402) {
        setPhase("idle");
        setPaywall({
          code: plan.courseCode ?? null,
          locked: plan.lockedCourse ?? null,
          reason: plan.error,
        });
        return;
      }
      if (planRes.status === 428) {
        setPhase("idle");
        setNeedAck(true);
        return;
      }
      if (!planRes.ok) {
        setPhase("idle");
        return setError(planRes.status === 503 ? (plan.message ?? plan.error) : (plan.error ?? "Could not start."));
      }

      setCoverage(plan.coverage);
      setBorrowedFrom(plan.borrowedFrom ?? []);
      setCourseCode(plan.courseCode ?? null);
      setTriesLeft(plan.triesLeft ?? null);

      const post = (payload: object) =>
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseInput, syllabus, ...payload }),
        });

      setPhase("pooling");
      const t1 = Date.now();
      const poolRes = await post({ phase: "pool", blueprint: plan.blueprint });
      const pool = await poolRes.json();
      if (!poolRes.ok) {
        setPhase("idle");
        return setError(poolRes.status === 503 ? (pool.message ?? pool.error) : (pool.error ?? "Could not rank questions."));
      }
      await hold(t1, 1800);

      setPhase("writing");
      const writeRes = await post({
        phase: "write",
        blueprint: plan.blueprint,
        candidates: pool.candidates,
      });
      const written = await writeRes.json();
      if (!writeRes.ok) {
        setPhase("idle");
        if (writeRes.status === 402)
          return setPaywall({
            code: plan.courseCode ?? null,
            locked: written.lockedCourse ?? null,
            reason: written.error,
          });
        if (writeRes.status === 428) return setNeedAck(true);
        return setError(writeRes.status === 503 ? (written.message ?? written.error) : (written.error ?? "Generation failed."));
      }
      setSets(written.sets ?? []);
      setIsPaid(Boolean(written.isPaid));
      setTriesLeft(written.triesLeft ?? null);
      setPhase("done");
    } catch {
      setPhase("idle");
      setError("Network error. Try again.");
    }
  }, [courseInput, syllabus, ackedAt]);

  const busy = phase === "planning" || phase === "pooling" || phase === "writing";

  // Count-up ticker while the blueprint is being built.
  useEffect(() => {
    if (phase !== "planning" || papersRead === 0) return;
    const step = Math.max(180, 4200 / papersRead);
    const id = setInterval(() => {
      setScanned((s) => (s >= papersRead ? s : s + 1));
    }, step);
    return () => clearInterval(id);
  }, [phase, papersRead]);

  return (
    <main className="min-h-screen pb-32">
      <Container className="flex items-center justify-between py-5 no-print sm:py-6">
        <Wordmark size="md" />
        <div className="flex items-center gap-3 text-body-sm text-muted">
          <span className="hidden max-w-[180px] truncate sm:inline">{email}</span>
          <ThemeToggle />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-pill border border-text/25 px-3 py-1.5 transition-colors hover:border-text/50 hover:text-text"
          >
            Sign out
          </button>
        </div>
      </Container>

      <Container className="grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* controls */}
        <div className="space-y-5 no-print">
          <div>
            <h1 className="text-h2 font-medium tracking-tight text-text">Predict a paper</h1>
            <p className="mt-2 text-body-sm text-muted">
              Type your course code. Paste the syllabus if it’s a new subject or yours differs.
            </p>
          </div>

          {error && (
            <div className="rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm text-danger">
              {error}
              <a href="/support" className="ml-2 underline hover:no-underline">
                Report it
              </a>
            </div>
          )}

          <div className="relative">
            <label className="mb-2 block text-body-sm text-muted">Course code</label>
            <input
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
              placeholder="CA25121"
              className="w-full rounded-input border border-border bg-surface-2 px-4 py-3 font-mono text-body text-text placeholder:text-faint focus:border-accent focus:outline-none"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-surface-2">
                {suggestions.map((s) => (
                  <li key={s.code}>
                    <button
                      onClick={() => {
                        setCourseInput(s.code);
                        setSuggestions([]);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-body-sm hover:bg-surface"
                    >
                      <span className="font-mono text-text">{s.code}</span>
                      <span className="truncate text-faint">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <TextArea
            label="Syllabus"
            value={syllabus}
            onChange={(e) => setSyllabus(e.target.value)}
            placeholder="Paste the module-wise syllabus for your section…"
            hint="Used as the hard boundary — nothing outside it will be asked."
          />

          <Button onClick={run} disabled={busy} className="w-full py-3">
            {busy
              ? STEP_COPY[phase as "planning" | "pooling" | "writing"]
              : sets.length
                ? "Regenerate"
                : "Generate papers"}
          </Button>

          {coverage && <CoverageNote coverage={coverage} borrowedFrom={borrowedFrom} />}

          {triesLeft != null && sets.length > 0 && (
            <p className="fade-in text-caption text-faint">
              {isPaid ? "Subject unlocked" : "Free plan"} · {triesLeft} regeneration
              {triesLeft === 1 ? "" : "s"} left for{" "}
              <span className="font-mono text-muted">{courseCode ?? courseInput}</span>.
              Wrong syllabus? Fix it above and regenerate — switching to another course needs
              payment.
            </p>
          )}
        </div>

        {/* output */}
        <div>
          {busy && (
            <Card className="flex min-h-[420px] flex-col justify-center gap-5">
              {(["planning", "pooling", "writing"] as const).map((p, i) => {
                const order = { planning: 0, pooling: 1, writing: 2 }[phase as
                  | "planning"
                  | "pooling"
                  | "writing"];
                const state = i < order ? "done" : i === order ? "active" : "todo";
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-pill border text-caption ${
                        state === "done"
                          ? "border-accent bg-accent text-white"
                          : state === "active"
                            ? "border-accent text-accent"
                            : "border-border text-faint"
                      }`}
                    >
                      {state === "done" ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-body-sm ${state === "todo" ? "text-faint" : "text-text"}`}
                    >
                      {p === "planning" && state === "active" && papersRead > 0
                        ? `Reading past paper ${Math.min(scanned + 1, papersRead)} of ${papersRead}…`
                        : STEP_COPY[p]}
                    </span>
                    {state === "active" && (
                      <span className="cursor-blink ml-auto text-accent">▍</span>
                    )}
                  </div>
                );
              })}
              {papersRead > 0 && (
                <div className="h-1 overflow-hidden rounded-pill bg-surface-2">
                  <div
                    className="h-full bg-accent transition-[width] duration-300"
                    style={{
                      width: `${
                        phase === "planning"
                          ? (scanned / papersRead) * 33
                          : phase === "pooling"
                            ? 66
                            : 100
                      }%`,
                    }}
                  />
                </div>
              )}
              <p className="mt-1 border-t border-border pt-4 font-serif text-body italic text-muted">
                {pickHype("generating", phase.length)}
              </p>
            </Card>
          )}

          {!busy && sets.length === 0 && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center gap-2 text-center">
              <p className="font-serif text-h3 italic text-muted">{pickHype("empty")}</p>
              <p className="max-w-xs text-body-sm text-faint">
                Your three predicted 25-mark papers will show up here.
              </p>
            </Card>
          )}

          {!busy && sets.length > 0 && (
            <div>
              <p className="mb-4 font-serif text-lead italic text-muted no-print">
                {pickHype("done", activeSet)}
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
                {sets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSet(i)}
                    className={`rounded-pill px-4 py-1.5 text-body-sm transition-colors ${
                      i === activeSet
                        ? "bg-accent text-white"
                        : "border border-border text-muted hover:text-text"
                    }`}
                  >
                    Set {String.fromCharCode(65 + i)}
                  </button>
                ))}
                <button
                  onClick={() => window.print()}
                  className="ml-auto rounded-pill border border-border px-4 py-1.5 text-body-sm text-muted hover:text-text"
                >
                  Download PDF
                </button>
              </div>

              <article className="print-sheet overflow-x-auto rounded-sheet border border-border bg-surface p-6 font-paper text-[1.02rem] leading-[1.7] text-text sm:p-10 [&_b]:font-semibold [&_div]:text-center [&_h1]:text-h3 [&_hr]:my-5 [&_hr]:border-border [&_img]:hidden [&_p]:my-2.5 [&_strong]:font-semibold [&_table]:block [&_table]:overflow-x-auto">
                <Markdown>{sets[activeSet] ?? ""}</Markdown>
              </article>
              <div className="mt-5">
                <FeedbackBar subjectCode={courseCode ?? courseInput} />
              </div>
            </div>
          )}
        </div>
      </Container>

      {paywall && (
        <PaywallModal
          courseCode={paywall.code}
          locked={paywall.locked}
          reason={paywall.reason}
          onClose={() => setPaywall(null)}
        />
      )}

      {needAck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 backdrop-blur-sm p-6 no-print">
          <Card className="max-w-md">
            <h2 className="text-h3 font-normal text-text">Before we start</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-muted">{DISCLAIMER_ACK}</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={ackDisclaimer}>I understand</Button>
              <button
                onClick={() => setNeedAck(false)}
                className="text-body-sm text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

function CoverageNote({
  coverage,
  borrowedFrom,
}: {
  coverage: string;
  borrowedFrom: string[];
}) {
  if (coverage === "full") {
    return (
      <p className="fade-in flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted">
        <MonoChip>grounded</MonoChip> Predicted from this course&apos;s real past mid-sem papers.
      </p>
    );
  }
  return (
    <div className="fade-in space-y-2 text-caption text-muted">
      <p>
        <MonoChip>softer prediction</MonoChip>{" "}
        {coverage === "new-course"
          ? "This course isn't in cramBIT's database yet."
          : "No PYQs on record for this course."}{" "}
        It&apos;s predicted from your syllabus
        {borrowedFrom.length ? " plus past papers of subjects with a similar syllabus" : ""}.
        Use at your own risk.
      </p>
      {borrowedFrom.length > 0 && (
        <p className="text-faint">Similar subjects used: {borrowedFrom.join(", ")}</p>
      )}
    </div>
  );
}
