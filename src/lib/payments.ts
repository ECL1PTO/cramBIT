import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendActivationEmail } from "@/lib/notify";

export async function applyDecision(
  db: SupabaseClient,
  claimId: string,
  decision: "approved" | "rejected",
  reviewer: string,
): Promise<{ ok: boolean; message: string }> {
  const { data: claim } = await db
    .from("payment_claims")
    .select("id, status, plan, subject_code, user_id")
    .eq("id", claimId)
    .maybeSingle();

  if (!claim) return { ok: false, message: "Claim not found." };
  if (claim.status !== "pending") {
    return { ok: false, message: `Already ${claim.status}.` };
  }

  const { error } = await db
    .from("payment_claims")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewer,
    })
    .eq("id", claimId)
    .eq("status", "pending"); // guard against races

  if (error) return { ok: false, message: "Update failed." };

  if (decision === "approved") {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", claim.user_id)
      .single();
    if (profile?.email) {
      await sendActivationEmail(
        profile.email,
        claim.plan === "bundle" ? "season bundle" : `${claim.subject_code}`,
      );
    }
  }

  return { ok: true, message: `Claim ${decision}.` };
}
