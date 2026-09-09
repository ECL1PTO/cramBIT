import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { getCourse } from "@/lib/engine/data";
import { amountForPlan } from "@/data/pricing";
import { notifyAdminOfClaim } from "@/lib/notify";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["subject", "bundle"]),
  subjectCode: z.string().max(20).optional(),
  utr: z.string().regex(/^[0-9A-Za-z]{8,22}$/, "Enter a valid UPI reference / UTR."),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request." },
      { status: 400 },
    );
  }
  const { plan, subjectCode, utr } = parsed.data;

  // Server decides scope + amount. Client input is not trusted.
  let code: string | null = null;
  if (plan === "subject") {
    const course = subjectCode ? getCourse(subjectCode) : null;
    if (!course) {
      return NextResponse.json({ error: "Unknown subject." }, { status: 400 });
    }
    code = course.code;
  }
  const amount = amountForPlan(plan);

  const db = createServiceClient();
  const { data, error } = await db
    .from("payment_claims")
    .insert({
      user_id: user.id,
      plan,
      subject_code: code,
      amount,
      upi_utr: utr,
    })
    .select("id")
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "That reference is already submitted, or you have a claim pending."
      : "Could not record the claim.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  await notifyAdminOfClaim({
    claimId: data.id,
    email: user.email ?? "unknown",
    plan,
    subjectCode: code,
    amount,
    utr,
  });

  return NextResponse.json({ ok: true });
}
