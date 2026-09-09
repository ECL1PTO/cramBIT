import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import {
  borrowedPyqs,
  getCourse,
  getPyqs,
  normalizeCode,
  similarCourses,
} from "./data";
import { generate, MODELS, parseJson } from "./gemini";
import { analysisPrompt, predictionPrompt, validationPrompt } from "./prompts";
import {
  BlueprintSchema,
  PredictedSetsSchema,
  type Blueprint,
  type Coverage,
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
}

export function resolve(courseInput: string, pastedSyllabus: string): Resolved {
  const code = normalizeCode(courseInput);
  const course = getCourse(code);
  const pyqs = course ? getPyqs(code) : null;

  let coverage: Coverage;
  if (course && pyqs && pyqs.historical_papers.length >= 2) coverage = "full";
  else if (course) coverage = "syllabus-only";
  else coverage = "new-course";

  const syllabus = (course?.syllabus?.trim() || pastedSyllabus.trim()).slice(
    0,
    SYLLABUS_CAP,
  );
  const neighbours = pyqs ? [] : similarCourses(syllabus, 4);

  return {
    coverage,
    code: course ? code : null,
    name: course?.name ?? code.slice(0, 40),
    syllabus,
    needsSyllabus: !syllabus || syllabus.length < 40,
    borrowedFrom: neighbours.map((n) => `${n.code} — ${n.name}`),
  };
}

/** Pass 1 — analysis blueprint (DB-cached). */
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

  const ownPyqs = r.code ? getPyqs(r.code) : null;
  const neighbours = ownPyqs ? [] : similarCourses(r.syllabus, 4);
  const borrowed = borrowedPyqs(neighbours.map((n) => n.code));

  const raw = await generate({
    model: MODELS.reason,
    json: true,
    prompt: analysisPrompt({
      courseName: r.name,
      syllabus: r.syllabus,
      coverage: r.coverage,
      ownPapers: ownPyqs?.historical_papers ?? [],
      borrowedPapers: neighbours.map((n, i) => ({
        code: n.code,
        name: n.name,
        papers: borrowed[i]?.historical_papers ?? [],
      })),
    }),
  });
  const blueprint = BlueprintSchema.parse(parseJson<unknown>(raw));

  await db
    .from("blueprints")
    .upsert(
      { subject_key: subjectKey, syllabus_hash, blueprint },
      { onConflict: "subject_key,syllabus_hash" },
    );
  return blueprint;
}

/** Pass 2 + 3 — write the papers and validate them. */
export async function writeSets(
  r: Resolved,
  blueprint: Blueprint,
  setCount = 4,
): Promise<string[]> {
  const codeLabel = r.code ?? r.name.toUpperCase();

  const raw = await generate({
    model: MODELS.reason,
    json: true,
    maxOutputTokens: 12000,
    prompt: predictionPrompt({
      courseCode: codeLabel,
      courseName: r.name,
      syllabus: r.syllabus,
      blueprint,
      setCount,
    }),
  });
  const { sets } = PredictedSetsSchema.parse(parseJson<unknown>(raw));

  const checked = await Promise.all(
    sets.map(async (set) => {
      const ok = await generate({
        model: MODELS.fast,
        json: true,
        prompt: validationPrompt(set, r.syllabus),
      })
        .then((v) => parseJson<{ ok: boolean }>(v).ok)
        .catch(() => true);
      return { set, ok };
    }),
  );

  const out: string[] = [];
  for (const c of checked) {
    if (c.ok) {
      out.push(c.set);
      continue;
    }
    try {
      const retry = await generate({
        model: MODELS.reason,
        json: true,
        prompt: predictionPrompt({
          courseCode: codeLabel,
          courseName: r.name,
          syllabus: r.syllabus,
          blueprint,
          setCount: 1,
        }),
      });
      out.push(PredictedSetsSchema.parse(parseJson<unknown>(retry)).sets[0] ?? c.set);
    } catch {
      out.push(c.set);
    }
  }
  return out;
}
