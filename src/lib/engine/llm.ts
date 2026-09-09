import "server-only";
import { env } from "@/lib/env";
import { generate as geminiGenerate } from "./gemini";

/**
 * Text-reasoning LLM for the engine and tutor.
 *
 * Prefers Groq (free, fast, reliable — Llama) when GROQ_API_KEY is set;
 * falls back to Gemini Flash. PDF/vision work stays on Gemini (see gemini.ts).
 */

type Tier = "reason" | "fast";

// gpt-oss-120b is an open-weight reasoning model, free on Groq, strong at
// structured analysis — this is the "better than Gemini free" the engine wants.
const GROQ_MODELS: Record<Tier, string> = {
  reason: "openai/gpt-oss-120b",
  fast: "llama-3.3-70b-versatile",
};

interface ChatOpts {
  tier: Tier;
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}

async function groqChat({
  tier,
  system,
  prompt,
  json,
  maxTokens = 8192,
}: ChatOpts): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODELS[tier],
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: json ? 0.4 : 0.8,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("Groq empty response");
  return text;
}

export async function chat(opts: ChatOpts): Promise<string> {
  if (env.GROQ_API_KEY) {
    try {
      return await groqChat(opts);
    } catch (err) {
      console.warn("Groq failed, falling back to Gemini:", err);
    }
  }
  return geminiGenerate({
    model: opts.tier === "reason" ? "gemini-flash-latest" : "gemini-flash-lite-latest",
    system: opts.system,
    prompt: opts.prompt,
    json: opts.json,
    maxOutputTokens: opts.maxTokens,
  });
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
