"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Markdown from "markdown-to-jsx";
import { createClient } from "@/utils/supabase/client";
import { Button, Card, Container, MonoChip, TextArea } from "@/components/ui";
import { DISCLAIMER_ACK } from "@/data/legal";
import { PaywallModal } from "@/components/paywall-modal";
import { AITutor } from "@/components/ai-tutor";

type Phase = "idle" | "planning" | "pooling" | "writing" | "done";
interface Suggestion {
  code: string;
  name: string;
  semester: number | null;
  grounding: string;
}

const STEP_COPY: Record<"planning" | "pooling" | "writing", string> = {
  planning: "Reading past papers, building the topic blueprint…",
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

  const [paywall, setPaywall] = useState<null | { code: string | null }>(null);
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

    try {
      const planRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "plan", courseInput, syllabus }),
      });
      const plan = await planRes.json();

      if (planRes.status === 402) {
        setPhase("idle");
        setPaywall({ code: plan.courseCode ?? null });
        return;
      }
      if (planRes.status === 428) {
        setPhase("idle");
        setNeedAck(true);
        return;
      }
      if (!planRes.ok) {
        setPhase("idle");
        return setError(plan.error ?? "Could not start.");
      }

      setCoverage(plan.coverage);
      setBorrowedFrom(plan.borrowedFrom ?? []);
      setCourseCode(plan.courseCode ?? null);

      const post = (payload: object) =>
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseInput, syllabus, ...payload }),
        });

      setPhase("pooling");
      const poolRes = await post({ phase: "pool", blueprint: plan.blueprint });
      const pool = await poolRes.json();
      if (!poolRes.ok) {
        setPhase("idle");
        return setError(pool.error ?? "Could not rank questions.");
      }

      setPhase("writing");
      const writeRes = await post({
        phase: "write",
        blueprint: plan.blueprint,
        candidates: pool.candidates,
      });
      const written = await writeRes.json();
      if (!writeRes.ok) {
        setPhase("idle");
        if (writeRes.status === 402) return setPaywall({ code: plan.courseCode ?? null });
        if (writeRes.status === 428) return setNeedAck(true);
        return setError(written.error ?? "Generation failed.");
      }
      setSets(written.sets ?? []);
      setIsPaid(Boolean(written.isPaid));
      setPhase("done");
    } catch {
      setPhase("idle");
      setError("Network error. Try again.");
    }
  }, [courseInput, syllabus, ackedAt]);

  const busy = phase === "planning" || phase === "pooling" || phase === "writing";

  return (
    <main className="min-h-screen bg-onyx pb-32">
      <Container className="flex items-center justify-between py-6 no-print">
        <Link href="/" className="font-mono text-body-sm text-ivory">
          cramBIT
        </Link>
        <div className="flex items-center gap-4 text-body-sm text-ash">
          <span className="hidden sm:inline">{email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="hover:text-ivory"
          >
            Sign out
          </button>
        </div>
      </Container>

      <Container className="grid gap-8 lg:grid-cols-[380px_1fr]">
        {/* controls */}
        <div className="space-y-5 no-print">
          <div>
            <h1 className="text-h2 font-normal tracking-tight text-ivory">Predict a paper</h1>
            <p className="mt-2 text-body-sm text-ash">
              Type your course code. Paste the syllabus if it’s a new subject or yours differs.
            </p>
          </div>

          {error && (
            <p className="rounded-input border border-danger/40 bg-danger/10 px-4 py-3 text-body-sm text-danger">
              {error}
            </p>
          )}

          <div className="relative">
            <label className="mb-2 block text-body-sm text-ash">Course code</label>
            <input
              value={courseInput}
              onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
              placeholder="CA25121"
              className="w-full rounded-input border border-hairline bg-obsidian px-4 py-3 font-mono text-body text-ivory placeholder:text-faint focus:border-cobalt focus:outline-none"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-hairline bg-obsidian">
                {suggestions.map((s) => (
                  <li key={s.code}>
                    <button
                      onClick={() => {
                        setCourseInput(s.code);
                        setSuggestions([]);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-body-sm hover:bg-graphite"
                    >
                      <span className="font-mono text-ivory">{s.code}</span>
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

          <Button onClick={run} disabled={busy} className="w-full">
            {busy ? STEP_COPY[phase as "planning" | "pooling" | "writing"] : "Generate papers"}
          </Button>

          {coverage && (
            <CoverageNote coverage={coverage} borrowedFrom={borrowedFrom} />
          )}
        </div>

        {/* output */}
        <div>
          {busy && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
              <span className="h-2 w-2 animate-ping rounded-full bg-cobalt" />
              <p className="text-body-sm text-ash">{STEP_COPY[phase as "planning" | "pooling" | "writing"]}</p>
            </Card>
          )}

          {!busy && sets.length === 0 && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <p className="max-w-xs text-body-sm text-faint">
                Your predicted papers will appear here — distinct 25-mark sets.
              </p>
            </Card>
          )}

          {!busy && sets.length > 0 && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
                {sets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSet(i)}
                    className={`rounded-pill px-4 py-1.5 text-body-sm transition-colors ${
                      i === activeSet
                        ? "bg-cobalt text-white"
                        : "border border-hairline text-ash hover:text-ivory"
                    }`}
                  >
                    Set {String.fromCharCode(65 + i)}
                  </button>
                ))}
                <button
                  onClick={() => window.print()}
                  className="ml-auto rounded-pill border border-hairline px-4 py-1.5 text-body-sm text-ash hover:text-ivory"
                >
                  Download PDF
                </button>
              </div>

              <article className="print-sheet rounded-sheet border border-hairline bg-graphite p-8 font-mono text-body-sm leading-relaxed text-ivory [&_h1]:text-h3 [&_hr]:my-4 [&_hr]:border-hairline [&_p]:my-2">
                <Markdown>{sets[activeSet] ?? ""}</Markdown>
              </article>
            </div>
          )}
        </div>
      </Container>

      {sets.length > 0 && isPaid && (
        <AITutor courseCode={courseCode ?? courseInput} paperContent={sets[activeSet] ?? ""} />
      )}

      {sets.length > 0 && !isPaid && (
        <button
          onClick={() => setPaywall({ code: courseCode })}
          className="fixed bottom-5 right-5 z-40 rounded-pill border border-hairline px-5 py-3 text-body-sm text-ash hover:text-ivory no-print"
        >
          Unlock the AI tutor
        </button>
      )}

      {paywall && (
        <PaywallModal
          courseCode={paywall.code}
          onClose={() => setPaywall(null)}
        />
      )}

      {needAck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/80 p-6 no-print">
          <Card className="max-w-md">
            <h2 className="text-h3 font-normal text-ivory">Before we start</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-ash">{DISCLAIMER_ACK}</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={ackDisclaimer}>I understand</Button>
              <button
                onClick={() => setNeedAck(false)}
                className="text-body-sm text-ash hover:text-ivory"
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
      <p className="text-caption text-ash">
        <MonoChip>grounded</MonoChip> Predicted from this course’s real past mid-sem papers.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-caption text-ash">
      <p>
        <MonoChip>use at your own risk</MonoChip>{" "}
        {coverage === "new-course"
          ? "This course isn't in our database."
          : "No past papers on record for this course."}{" "}
        Predicted from your syllabus{borrowedFrom.length ? " and related subjects" : ""}.
      </p>
      {borrowedFrom.length > 0 && (
        <p className="text-faint">Patterns borrowed from: {borrowedFrom.join(", ")}</p>
      )}
    </div>
  );
}
