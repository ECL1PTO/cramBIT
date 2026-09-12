import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBJECT_REGEN_CAP, FAIR_USE_SUBJECT_CAP } from "@/lib/limits";

/**
 * cramBIT is free for everyone — no payment, no plans. The only limits are
 * fair-use caps that protect the free-tier LLM budget from a single account
 * looping generations forever:
 *
 * - a user may generate for up to FAIR_USE_SUBJECT_CAP distinct subjects
 * - each subject may be (re)generated up to SUBJECT_REGEN_CAP times
 *
 * The course identity is the resolved subject code, or (for unknown courses)
 * the normalised typed string — stored in generated_papers.course_input.
 *
 * Caps are deliberately tight: every generation is a 4-5 call multi-pass job
 * against a shared free-tier LLM budget, so no single account gets an
 * unlimited re-roll.
 */
export { SUBJECT_REGEN_CAP, FAIR_USE_SUBJECT_CAP };

export interface EntitlementCheck {
  allowed: boolean;
  reason?: "subject-cap" | "regen-cap";
  lockedCourse?: string;
  triesLeft?: number;
}

export async function checkEntitlement(
  db: SupabaseClient,
  userId: string,
  _subjectCode: string | null,
  courseKey: string,
): Promise<EntitlementCheck> {
  // Admins (the operator) get unlimited, unrestricted access to every course.
  const { data: prof } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.is_admin) return { allowed: true };

  const { data: rows } = await db
    .from("generated_papers")
    .select("subject_code, course_input")
    .eq("user_id", userId);

  const all = rows ?? [];
  const distinctSubjects = new Set(all.map((r) => r.subject_code ?? r.course_input));
  const used = all.filter((r) => (r.subject_code ?? r.course_input) === courseKey).length;

  if (!distinctSubjects.has(courseKey) && distinctSubjects.size >= FAIR_USE_SUBJECT_CAP) {
    return { allowed: false, reason: "subject-cap" };
  }
  if (used >= SUBJECT_REGEN_CAP) {
    return { allowed: false, reason: "regen-cap", lockedCourse: courseKey };
  }
  return { allowed: true, triesLeft: SUBJECT_REGEN_CAP - used };
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
