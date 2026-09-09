import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/utils/supabase/service";
import { checkEntitlement, rateLimit } from "@/lib/entitlement";
import { normalizeCode } from "@/lib/engine/data";
import { chat } from "@/lib/engine/llm";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
  courseContext: z.string().max(80),
  paperContext: z.string().max(20000),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { messages, courseContext, paperContext } = body.data;

  const db = createServiceClient();
  const code = normalizeCode(courseContext);
  const ent = await checkEntitlement(db, user.id, code || null, code);
  // The AI tutor is a paid-tier feature — the free paper does not include it.
  if (!ent.allowed || !ent.isPaid) {
    return NextResponse.json({ error: "needs-payment" }, { status: 402 });
  }
  if (!(await rateLimit(db, user.id, "chat"))) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n");

  const system = `You are the cramBIT tutor. The student is preparing for the ${courseContext}
mid-sem using this predicted paper:
---
${paperContext}
---
Help them solve and understand these questions. Be concise; use Markdown; show working for
derivations and code. If asked something outside the paper's scope, answer briefly and steer
back.`;

  try {
    const text = await chat({
      tier: "reason",
      system,
      prompt: `${transcript}\nTutor:`,
      maxTokens: 2048,
    });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("chat error:", err);
    return NextResponse.json({ error: "Tutor is unavailable right now." }, { status: 502 });
  }
}
