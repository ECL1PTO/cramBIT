import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";

// The disclaimer acknowledgement is written server-side with the service role:
// `profiles` is column-locked and RLS-restricted, so a browser update of
// `disclaimer_ack_at` silently affects zero rows.
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const db = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await db
    .from("profiles")
    .update({ disclaimer_ack_at: now })
    .eq("id", user.id);

  if (error) {
    console.error("disclaimer ack failed:", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ackedAt: now });
}
