import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EntitlementCheck {
  allowed: boolean;
  isPaid: boolean; // true => covered by a paid entitlement; false => uses the free credit
  reason?: "needs-payment";
}

/**
 * `db` must be a service-role client. `subjectCode` is null for unknown/new courses.
 */
export async function checkEntitlement(
  db: SupabaseClient,
  userId: string,
  subjectCode: string | null,
): Promise<EntitlementCheck> {
  const { data: ents } = await db
    .from("entitlements")
    .select("scope, subject_code")
    .eq("user_id", userId)
    .eq("active", true);

  const hasBundle = ents?.some((e) => e.scope === "bundle") ?? false;
  const hasSubject =
    subjectCode != null &&
    (ents?.some((e) => e.scope === "subject" && e.subject_code === subjectCode) ??
      false);

  if (hasBundle || hasSubject) return { allowed: true, isPaid: true };

  // Free credit: exactly one lifetime unpaid generation.
  const { count } = await db
    .from("generated_papers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_paid", false);

  if ((count ?? 0) === 0) return { allowed: true, isPaid: false };

  return { allowed: false, isPaid: false, reason: "needs-payment" };
}

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  generate: { max: 20, windowMs: 24 * 60 * 60 * 1000 },
  chat: { max: 60, windowMs: 60 * 60 * 1000 },
};

export async function rateLimit(
  db: SupabaseClient,
  userId: string,
  bucket: keyof typeof LIMITS,
): Promise<boolean> {
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
