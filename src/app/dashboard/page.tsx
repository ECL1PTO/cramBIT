"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "markdown-to-jsx";
import { createClient } from "@/utils/supabase/client";
import { Button, Card, Container, TextArea } from "@/components/ui";
import { DISCLAIMER_ACK } from "@/data/legal";
import { pickHype } from "@/data/hype";
import { PaywallModal } from "@/components/paywall-modal";
import { FeedbackBar } from "@/components/feedback-bar";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButton } from "@/components/share-button";

type Phase = "idle" | "planning" | "pooling" | "writing" | "done";
interface Suggestion {
  code: string;
  name: string;
  semester: number | null;
  grounding: string;
}

/** The engine asks for clean Markdown, but models still slip in HTML wrappers
 *  (<div align="center">, <center>, <br>) that drag the whole paper off-axis. */
function cleanPaper(md: string): string {
  return md
    .replace(/<\/?(?:div|center|span|font|section|article)[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\salign\s*=\s*"[^"]*"/gi, "")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const [errDetail, setErrDetail] = useState<string | null>(null);
  const fail = (res: Response, body: { message?: string; error?: string; detail?: string }, fallback: string) => {
    setPhase("idle");
    setErrDetail(body.detail ?? null);
    setError(res.status === 503 ? (body.message ?? body.error ?? fallback) : (body.error ?? fallback));
  };
  const [sets, setSets] = useState<string[]>([]);
  const [activeSet, setActiveSet] = useState(0);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [triesLeft, setTriesLeft] = useState<number | null>(null);
  const [papersRead, setPapersRead] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [copied, setCopied] = useState(false);

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

  const [acking, setAcking] = useState(false);
  async function ackDisclaimer() {
    if (acking) return;
    setAcking(true);
    try {
      const res = await fetch("/api/disclaimer", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not save your acknowledgement. Try again.");
        return;
      }
      setAckedAt(body.ackedAt ?? new Date().toISOString());
      setNeedAck(false);
      setError(null);
    } finally {
      setAcking(false);
    }
  }

  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setError(null);
    setErrDetail(null);
  }, []);

  const run = useCallback(async () => {
    setError(null);
    setErrDetail(null);
    if (!courseInput.trim()) return setError("Enter your course code.");
    if (!ackedAt) return setNeedAck(true);

    const ac = new AbortController();
    abortRef.current = ac;
    const { signal } = ac;

    setPhase("planning");
    setSets([]);
    setActiveSet(0);
    setPapersRead(0);
    setScanned(0);

    const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    // Vercel's own hard 60s function timeout (502/504) returns an HTML error
    // page, not our JSON — retry those exactly like our own 503 "capacity"
    // reply, since from the user's side it's the same story either way.
    const RETRY_STATUSES = new Set([502, 503, 504]);
    // A safe .json() — a Vercel-level timeout page isn't JSON at all, so a raw
    // res.json() throws and used to surface as a scary generic "Network
    // error." Parse failures now read as the same friendly capacity message.
    const safeJson = async (res: Response) => {
      try {
        return await res.json();
      } catch {
        return { error: "capacity", message: undefined };
      }
    };

    // A 503/504 "capacity" reply is one gateway attempt (or the serverless
    // function itself) having a bad moment, not a real outage — retrying is a
    // brand-new serverless call with a fresh 55s shot at the gateway, so most
    // transient failures never reach the user.
    const CAPACITY_RETRIES = 3;
    const postRetrying = async (body: object): Promise<Response> => {
      let res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      for (let i = 0; i < CAPACITY_RETRIES && RETRY_STATUSES.has(res.status) && !signal.aborted; i++) {
        await wait(1500);
        if (signal.aborted) break;
        res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      }
      return res;
    };

    try {
      const planRes = await postRetrying({ phase: "plan", courseInput, syllabus });
      if (signal.aborted) return;
      const plan = await safeJson(planRes);
      if (planRes.ok && plan.papersRead) {
        setPapersRead(plan.papersRead);
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
      if (!planRes.ok) return fail(planRes, plan, "Could not start.");

      setCourseCode(plan.courseCode ?? null);
      setTriesLeft(plan.triesLeft ?? null);

      const post = (payload: object) =>
        postRetrying({ courseInput, syllabus, ...payload });

      if (signal.aborted) return;
      setPhase("pooling");
      const poolRes = await post({ phase: "pool", blueprint: plan.blueprint });
      if (signal.aborted) return;
      const pool = await safeJson(poolRes);
      if (!poolRes.ok) return fail(poolRes, pool, "Could not rank questions.");

      if (signal.aborted) return;
      setPhase("writing");
      const writeRes = await post({
        phase: "write",
        blueprint: plan.blueprint,
        candidates: pool.candidates,
      });
      if (signal.aborted) return;
      const written = await safeJson(writeRes);
      if (!writeRes.ok) {
        setPhase("idle");
        if (writeRes.status === 402)
          return setPaywall({
            code: plan.courseCode ?? null,
            locked: written.lockedCourse ?? null,
            reason: written.error,
          });
        if (writeRes.status === 428) return setNeedAck(true);
        return fail(writeRes, written, "Generation failed.");
      }
      setSets(written.sets ?? []);
      setIsPaid(Boolean(written.isPaid));
      setTriesLeft(written.triesLeft ?? null);
      setPhase("done");
      abortRef.current = null;
    } catch (err) {
      setPhase("idle");
      abortRef.current = null;
      // A user-triggered abort is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (signal.aborted) return;
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
          <ShareButton
            compact
            label="Share"
            text="using cramBIT rn to predict my mid-sem papers off real past papers + my syllabus, kinda scary how accurate it is. first subject's free, you should try it"
            className="hidden sm:flex"
          />
          <ThemeToggle />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-pill border border-text/25 px-3 py-1.5 transition-[color,border-color,transform,opacity] duration-150 hover:border-text/50 hover:text-text active:scale-[0.96] active:opacity-80"
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
              {errDetail && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-danger/10 p-2 text-caption text-danger/80">
                  {errDetail}
                </pre>
              )}
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
          <p className="text-caption text-faint">
            Course not showing up? Paste its syllabus below and generate anyway — and{" "}
            <a href="/support" className="text-accent hover:underline">
              send us the code + syllabus
            </a>{" "}
            so we add it properly for everyone.
          </p>

          <TextArea
            label="Syllabus"
            value={syllabus}
            onChange={(e) => setSyllabus(e.target.value)}
            placeholder="Paste only the module-wise syllabus for your section…"
            hint="Only paste the portion actually covered in the mid-sem — usually 2 to 2.5 modules, not the full-semester syllabus. It's used as the hard boundary: nothing outside it will be asked."
          />

          {busy ? (
            <button
              onClick={stop}
              className="w-full rounded-pill border border-danger/50 py-3 text-body-sm font-medium text-danger transition-[color,background-color,transform,opacity] duration-150 hover:bg-danger/10 active:scale-[0.98] active:opacity-80"
            >
              {STEP_COPY[phase as "planning" | "pooling" | "writing"]}
              <span className="ml-2 opacity-70">— tap to stop</span>
            </button>
          ) : (
            <Button onClick={run} className="w-full py-3">
              {sets.length ? "Regenerate" : "Generate papers"}
            </Button>
          )}

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
                Your two predicted 25-mark papers will show up here.
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
                    className={`rounded-pill px-4 py-1.5 text-body-sm transition-[color,background-color,border-color,transform,opacity] duration-150 active:scale-[0.96] active:opacity-80 ${
                      i === activeSet
                        ? "bg-accent text-white"
                        : "border border-border text-muted hover:text-text"
                    }`}
                  >
                    Set {String.fromCharCode(65 + i)}
                  </button>
                ))}
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(sets[activeSet] ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch {
                      /* clipboard blocked — user can still select the text */
                    }
                  }}
                  className="ml-auto rounded-pill border border-border px-4 py-1.5 text-body-sm text-muted transition-[color,border-color,transform,opacity] duration-150 hover:text-text active:scale-[0.96] active:opacity-80"
                >
                  {copied ? "Copied ✓" : "Copy this set"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-pill border border-border px-4 py-1.5 text-body-sm text-muted transition-[color,border-color,transform,opacity] duration-150 hover:text-text active:scale-[0.96] active:opacity-80"
                >
                  Download PDF
                </button>
                <ShareButton
                  compact
                  label="Share with classmates"
                  text={`just generated my predicted ${courseCode ?? courseInput} mid-sem paper on cramBIT and ngl it's scary accurate 💀 real past papers + my syllabus → 2 full sets. try it before your mid-sem, first subject's free`}
                />
              </div>

              <article className="print-sheet overflow-x-auto rounded-sheet border border-border bg-surface p-6 text-left font-paper text-[1.02rem] leading-[1.7] text-text sm:p-10 [&_b]:font-semibold [&_h1]:mb-1 [&_h1]:text-center [&_h1]:text-h3 [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-center [&_h2]:text-body [&_h2]:font-semibold [&_hr]:my-5 [&_hr]:border-border [&_img]:hidden [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_td]:py-0.5 [&_td]:pr-6 [&_th]:pr-6 [&_th]:text-left">
                <Markdown>{cleanPaper(sets[activeSet] ?? "")}</Markdown>
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
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={ackDisclaimer} disabled={acking}>
                {acking ? "Saving…" : "I understand"}
              </Button>
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

