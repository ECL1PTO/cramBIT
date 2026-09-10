import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import {
  borrowedPyqs,
  getCourse,
  getPyqs,
  normalizeCode,
  similarCourses,
  topicFreqFor,
} from "./data";
import { chat, chatJson } from "./llm";
import { analysisPrompt, assemblyPrompt, candidatePoolPrompt } from "./prompts";
import { validatePaper } from "./validate";
import {
  BlueprintSchema,
  CandidatePoolSchema,
  type Blueprint,
  type Candidate,
  type Coverage,
  type PastPaper,
} from "./types";

const SYLLABUS_CAP = 8000;

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 24);
}

export interface Resolved {
  coverage: Coverage;
  code: string | null;
  name: string;
  syllabus: string;
  needsSyllabus: boolean;
  borrowedFrom: string[];
  papersRead: number;
}

export function resolve(courseInput: string, pastedSyllabus: string): Resolved {
  const code = normalizeCode(courseInput);
  const course = getCourse(code);
  const pyqs = course ? getPyqs(code) : null;

  let coverage: Coverage;
  if (course && pyqs && pyqs.historical_papers.length >= 2) coverage = "full";
  else if (course) coverage = "syllabus-only";
  else coverage = "new-course";

  const syllabus = (course?.syllabus?.trim() || pastedSyllabus.trim()).slice(0, SYLLABUS_CAP);
  const neighbours = pyqs ? [] : similarCourses(syllabus, 4);
  const borrowedCount = borrowedPyqs(neighbours.map((n) => n.code)).reduce(
    (n, f) => n + f.historical_papers.length,
    0,
  );

  return {
    coverage,
    code: course ? code : null,
    name: course?.name ?? code.slice(0, 40),
    syllabus,
    needsSyllabus: !syllabus || syllabus.length < 40,
    borrowedFrom: neighbours.map((n) => `${n.code}${n.name ? " — " + n.name : ""}`),
    papersRead: (pyqs?.historical_papers.length ?? 0) + borrowedCount,
  };
}

/** All past-paper evidence available for this course (own first, then similar). */
function gatherEvidence(r: Resolved): {
  own: PastPaper[];
  borrowed: { code: string; name: string; papers: PastPaper[] }[];
  all: PastPaper[];
} {
  const ownPyqs = r.code ? getPyqs(r.code) : null;
  const own = ownPyqs?.historical_papers ?? [];
  const neighbours = own.length ? [] : similarCourses(r.syllabus, 4);
  const borrowedFiles = borrowedPyqs(neighbours.map((n) => n.code));
  const borrowed = neighbours.map((n, i) => ({
    code: n.code,
    name: n.name ?? n.code,
    papers: borrowedFiles[i]?.historical_papers ?? [],
  }));
  return {
    own,
    borrowed,
    all: [...own, ...borrowed.flatMap((b) => b.papers)],
  };
}

/* ---------------------------------------------------------- pass 1: blueprint */

export async function buildBlueprint(r: Resolved): Promise<Blueprint> {
  const subjectKey = r.code ?? `new:${hash(r.syllabus)}`;
  const syllabus_hash = hash(r.syllabus);
  const db = createServiceClient();

  const { data } = await db
    .from("blueprints")
    .select("blueprint")
    .eq("subject_key", subjectKey)
    .eq("syllabus_hash", syllabus_hash)
    .maybeSingle();
  if (data?.blueprint) {
    const cached = BlueprintSchema.safeParse(data.blueprint);
    if (cached.success) return cached.data;
  }

  const ev = gatherEvidence(r);
  const blueprint = await chatJson(
    {
      tier: "reason",
      maxTokens: 2200,
      prompt: analysisPrompt({
        courseName: r.name,
        syllabus: r.syllabus,
        coverage: r.coverage,
        ownPapers: ev.own,
        borrowedPapers: ev.borrowed,
        topicFreq: r.code ? topicFreqFor(r.code) : undefined,
      }),
    },
    (v) => BlueprintSchema.parse(v),
  );

  await db
    .from("blueprints")
    .upsert(
      { subject_key: subjectKey, syllabus_hash, blueprint },
      { onConflict: "subject_key,syllabus_hash" },
    );
  return blueprint;
}

/* ------------------------------------------ pass 2: ranked candidate question pool */

export async function buildCandidatePool(
  r: Resolved,
  blueprint: Blueprint,
): Promise<Candidate[]> {
  const ev = gatherEvidence(r);
  const pool = await chatJson(
    {
      tier: "reason",
      maxTokens: 2600,
      prompt: candidatePoolPrompt({
        courseName: r.name,
        syllabus: r.syllabus,
        blueprint,
        pastPapers: ev.all,
      }),
    },
    (v) => CandidatePoolSchema.parse(v),
  );
  return pool.candidates.sort((a, b) => b.probability - a.probability);
}

/* ------------------------------------------ pass 3 + 4: assemble and validate */

/**
 * One batch of the write phase — up to 2 papers assembled + validated. The
 * route calls this once or twice so each HTTP request stays well inside
 * serverless timeouts and free-tier token/minute limits.
 */
export async function assembleBatch(
  r: Resolved,
  blueprint: Blueprint,
  candidates: Candidate[],
  count: number,
): Promise<string[]> {
  const codeLabel = r.code ?? r.name.toUpperCase();

  const assemble = (n: number) =>
    chat({
      tier: "reason",
      json: false,
      maxTokens: 4000,
      prompt: assemblyPrompt({
        courseCode: codeLabel,
        courseName: r.name,
        syllabus: r.syllabus,
        candidates,
        setCount: n,
      }),
    }).then((raw) =>
      raw
        .split("===SET_SPLIT===")
        .map((s) => s.trim())
        .filter((s) => s.length > 150),
    );

  const sets = (await assemble(count)).slice(0, count);
  const valid = sets.filter((s) => validatePaper(s).ok);

  // Only pay for a second round if the first was largely unusable.
  if (valid.length >= Math.min(2, count)) return sets;
  try {
    const retry = (await assemble(count)).slice(0, count);
    const retryValid = retry.filter((s) => validatePaper(s).ok);
    return retryValid.length > valid.length ? retry : sets;
  } catch {
    return sets;
  }
}
