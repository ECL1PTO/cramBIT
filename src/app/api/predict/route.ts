import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { checkEntitlement, rateLimit } from "@/lib/entitlement";
import {
  assembleBatch,
  buildBlueprint,
  buildCandidatePool,
  resolve,
} from "@/lib/engine/predict";
import { normalizeCode } from "@/lib/engine/data";
import { BlueprintSchema, CandidateSchema } from "@/lib/engine/types";
import { PRICING } from "@/data/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const SET_COUNT = 2;

const Body = z.object({
  phase: z.enum(["plan", "pool", "write"]),
  courseInput: z.string().min(1).max(80),
  syllabus: z.string().max(12000).default(""),
  blueprint: BlueprintSchema.optional(),
  candidates: z.array(CandidateSchema).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { phase, courseInput, syllabus, blueprint, candidates } = body.data;

  const db = createServiceClient();
  const r = resolve(courseInput, syllabus);

  if (r.needsSyllabus) {
    return NextResponse.json(
      { error: "Paste this course's syllabus so cramBIT can work from it.", needsSyllabus: true },
      { status: 422 },
    );
  }

  const courseKey = r.code ?? normalizeCode(courseInput);
  const ent = await checkEntitlement(db, user.id, r.code, courseKey);
  if (!ent.allowed) {
    return NextResponse.json(
      {
        error: ent.reason ?? "needs-payment",
        courseCode: r.code,
        lockedCourse: ent.lockedCourse ?? null,
        plans: { subject: r.code ? PRICING.perSubject : null, bundle: PRICING.bundle },
      },
      { status: 402 },
    );
  }

  try {
    if (phase === "plan") {
      const bp = await buildBlueprint(r);
      return NextResponse.json({
        coverage: r.coverage,
        courseCode: r.code,
        courseName: r.name,
        borrowedFrom: r.borrowedFrom,
        papersRead: r.papersRead,
        isPaid: ent.isPaid,
        triesLeft: ent.triesLeft ?? null,
        blueprint: bp,
      });
    }

    if (phase === "pool") {
      if (!blueprint) return NextResponse.json({ error: "Missing blueprint." }, { status: 400 });
      const pool = await buildCandidatePool(r, blueprint);
      return NextResponse.json({ candidates: pool });
    }

    // phase === "write"
    if (!blueprint || !candidates?.length) {
      return NextResponse.json({ error: "Missing plan data." }, { status: 400 });
    }

    if (!(await rateLimit(db, user.id, "generate"))) {
      return NextResponse.json(
        { error: "Daily generation limit reached. Try again tomorrow." },
        { status: 429 },
      );
    }

    const { data: profile } = await db
      .from("profiles")
      .select("disclaimer_ack_at")
      .eq("id", user.id)
      .single();
    if (!profile?.disclaimer_ack_at) {
      return NextResponse.json({ error: "disclaimer-required" }, { status: 428 });
    }

    const sets = await assembleBatch(r, blueprint, candidates, SET_COUNT);
    if (!sets.length) {
      return NextResponse.json(
        { error: "The engine could not assemble a valid paper. Please retry." },
        { status: 502 },
      );
    }

    const { error: insertError } = await db.from("generated_papers").insert({
      user_id: user.id,
      subject_code: r.code,
      course_input: courseKey,
      syllabus_text: r.syllabus,
      coverage: r.coverage,
      blueprint: { ...blueprint, topCandidates: candidates.slice(0, 12) },
      sets,
      set_count: sets.length,
      is_paid: ent.isPaid,
    });
    if (insertError) {
      // The paper was generated — don't fail the request, but the free-credit
      // counter depends on this row, so log loudly.
      console.error("generated_papers insert failed:", insertError);
    }

    return NextResponse.json({
      coverage: r.coverage,
      sets,
      isPaid: ent.isPaid,
      triesLeft: ent.triesLeft != null ? ent.triesLeft - 1 : null,
    });
  } catch (err) {
    console.error("predict error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // `detail` carries the raw provider/model errors — safe to expose (no secrets)
    // and it's the only way to debug the free-provider chain from the client.
    if (/exhausted|429|rate.?limit|quota|capacity/i.test(msg)) {
      return NextResponse.json(
        {
          error: "capacity",
          message:
            "cramBIT is at capacity right now — the AI's free daily limit is used up. It resets within a few hours. Your tries aren't spent; come back and generate then.",
          detail: msg.slice(0, 1200),
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "The engine hit a snag. Please try again.", detail: msg.slice(0, 1200) },
      { status: 502 },
    );
  }
}
