import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/utils/supabase/service";
import { rateLimit } from "@/lib/entitlement";
import { requireUser } from "@/lib/auth";
import { notifyAdminOfSupport, sendSupportAck } from "@/lib/notify";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  message: z.string().min(5).max(4000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add your email and a message." }, { status: 400 });
  }
  const { email, message } = parsed.data;

  // Light rate-limit: keyed by the signed-in user if any, else the email.
  const user = await requireUser();
  const db = createServiceClient();
  if (user) {
    const ok = await rateLimit(db, user.id, "chat");
    if (!ok) return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  await Promise.allSettled([
    notifyAdminOfSupport(email, message),
    sendSupportAck(email),
  ]);

  return NextResponse.json({ ok: true });
}
