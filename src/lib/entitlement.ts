import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Anti-abuse model (college students will do anything to avoid paying):
 *
 * - FREE plan: the first generation binds the user to ONE course. They may
 *   re-generate for that same course (tweaking the syllabus) up to
 *   FREE_REGEN_CAP times. Switching to any other course requires payment.
 * - PER-SUBJECT (₹49): unlocks exactly that subject, also capped at
 *   SUBJECT_REGEN_CAP re-generations so it can't become a de-facto bundle.
 * - BUNDLE (₹199): every subject, capped only by the daily rate limit.
 *
 * The course identity is the resolved subject code, or (for unknown courses)
 * the normalised typed string — stored in generated_papers.course_input.
 *
 * Caps are deliberately tight: every generation is a 4-5 call multi-pass job
 * against a shared free-tier LLM budget, so a free user gets a small number of
 * real attempts, not an unlimited re-roll.
 */

export const FREE_REGEN_CAP = 4;
export const SUBJECT_REGEN_CAP = 6;

export interface EntitlementCheck {
  allowed: boolean;
  isPaid: boolean;
  reason?: "needs-payment" | "regen-cap";
  lockedCourse?: string; // the course the free/paid plan is bound to
  triesLeft?: number;
}

export async function checkEntitlement(
  db: SupabaseClient,
  userId: string,
  subjectCode: string | null,
  courseKey: string,
): Promise<EntitlementCheck> {
  // Admins (the operator) get unlimited, unrestricted access to every course.
  const { data: prof } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.is_admin) return { allowed: true, isPaid: true };

  const { data: ents } = await db
    .from("entitlements")
    .select("scope, subject_code")
    .eq("user_id", userId)
    .eq("active", true);

  const hasBundle = ents?.some((e) => e.scope === "bundle") ?? false;
  const hasSubject =
    subjectCode != null &&
    (ents?.some((e) => e.scope === "subject" && e.subject_code === subjectCode) ?? false);

  if (hasBundle) return { allowed: true, isPaid: true };

  if (hasSubject) {
    const { count } = await db
      .from("generated_papers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("subject_code", subjectCode);
    const used = count ?? 0;
    if (used >= SUBJECT_REGEN_CAP) {
      return { allowed: false, isPaid: true, reason: "regen-cap", lockedCourse: subjectCode! };
    }
    return { allowed: true, isPaid: true, triesLeft: SUBJECT_REGEN_CAP - used };
  }

  // ---- Free plan ----
  const { data: freeRows } = await db
    .from("generated_papers")
    .select("subject_code, course_input")
    .eq("user_id", userId)
    .eq("is_paid", false)
    .order("created_at", { ascending: true });

  if (!freeRows?.length) {
    // First ever generation — this becomes their free course.
    return { allowed: true, isPaid: false, triesLeft: FREE_REGEN_CAP - 1 };
  }

  const boundKey = freeRows[0].subject_code ?? freeRows[0].course_input;
  if (boundKey !== courseKey) {
    return { allowed: false, isPaid: false, reason: "needs-payment", lockedCourse: boundKey };
  }
  if (freeRows.length >= FREE_REGEN_CAP) {
    return { allowed: false, isPaid: false, reason: "regen-cap", lockedCourse: boundKey };
  }
  return { allowed: true, isPaid: false, triesLeft: FREE_REGEN_CAP - freeRows.length };
}

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  generate: { max: 25, windowMs: 24 * 60 * 60 * 1000 },
  chat: { max: 60, windowMs: 60 * 60 * 1000 },
};

export async function rateLimit(
  db: SupabaseClient,
  userId: string,
  bucket: keyof typeof LIMITS,
): Promise<boolean> {
  const { data: prof } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.is_admin) return true;

  const cfg = LIMITS[bucket];
  const now = Date.now();

  const { data } = await db
    .from("rate_limits")
    .select("window_start, count")
    .eq("user_id", userId)
    .eq("bucket", bucket)
    .maybeSingle();

  const windowStart = data ? new Date(data.window_start).getTime() : 0;
  const fresh = now - windowStart > cfg.windowMs;
  const nextCount = fresh ? 1 : (data?.count ?? 0) + 1;
  if (nextCount > cfg.max) return false;

  await db.from("rate_limits").upsert(
    {
      user_id: userId,
      bucket,
      count: nextCount,
      window_start: fresh ? new Date(now).toISOString() : data!.window_start,
    },
    { onConflict: "user_id,bucket" },
  );
  return true;
}
