import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { checkEntitlement, rateLimit } from "@/lib/entitlement";
import { buildBlueprint, resolve, writeSets } from "@/lib/engine/predict";
import { BlueprintSchema } from "@/lib/engine/types";
import { PRICING } from "@/data/pricing";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  phase: z.enum(["plan", "write"]),
  courseInput: z.string().min(1).max(80),
  syllabus: z.string().max(12000).default(""),
  blueprint: BlueprintSchema.optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { phase, courseInput, syllabus, blueprint } = body.data;

  const db = createServiceClient();
  const r = resolve(courseInput, syllabus);

  if (r.needsSyllabus) {
    return NextResponse.json(
      {
        error:
          "This course isn't in our database — paste its syllabus so cramBIT can work from it.",
        coverage: r.coverage,
        needsSyllabus: true,
      },
      { status: 422 },
    );
  }

  const ent = await checkEntitlement(db, user.id, r.code);
  if (!ent.allowed) {
    return NextResponse.json(
      {
        error: "needs-payment",
        coverage: r.coverage,
        courseCode: r.code,
        plans: {
          subject: r.code ? PRICING.perSubject : null,
          bundle: PRICING.bundle,
        },
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
        isPaid: ent.isPaid,
        blueprint: bp,
      });
    }

    // phase === "write"
    if (!blueprint) {
      return NextResponse.json({ error: "Missing blueprint." }, { status: 400 });
    }

    const ok = await rateLimit(db, user.id, "generate");
    if (!ok) {
      return NextResponse.json(
        { error: "Daily generation limit reached. Try again tomorrow." },
        { status: 429 },
      );
    }

    // Disclaimer must be acknowledged.
    const { data: profile } = await db
      .from("profiles")
      .select("disclaimer_ack_at")
      .eq("id", user.id)
      .single();
    if (!profile?.disclaimer_ack_at) {
      return NextResponse.json({ error: "disclaimer-required" }, { status: 428 });
    }

    const sets = await writeSets(r, blueprint, 4);

    await db.from("generated_papers").insert({
      user_id: user.id,
      subject_code: r.code,
      course_input: courseInput.trim(),
      syllabus_text: r.syllabus,
      coverage: r.coverage,
      blueprint,
      sets,
      set_count: sets.length,
      is_paid: ent.isPaid,
    });

    return NextResponse.json({ coverage: r.coverage, sets, isPaid: ent.isPaid });
  } catch (err) {
    console.error("predict error:", err);
    return NextResponse.json(
      { error: "The engine hit a snag. Please try again." },
      { status: 502 },
    );
  }
}
