import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { applyDecision } from "@/lib/payments";

export const runtime = "nodejs";

const Body = z.object({
  claimId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const result = await applyDecision(
    db,
    parsed.data.claimId,
    parsed.data.decision,
    `admin:${user.email}`,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
