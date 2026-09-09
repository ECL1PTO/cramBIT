import "server-only";
import { env } from "@/lib/env";
import { generate as geminiGenerate } from "./gemini";

/**
 * Text-reasoning LLM for the engine and tutor.
 *
 * Provider order: Cerebras → Groq → Gemini Flash. The first two are
 * OpenAI-compatible and free; Cerebras has by far the highest free limits so
 * it's preferred when CEREBRAS_API_KEY is set. PDF/vision work stays on Gemini.
 */

type Tier = "reason" | "fast";

interface Provider {
  name: string;
  key: string | undefined;
  base: string;
  models: Record<Tier, string>;
}

const PROVIDERS: Provider[] = [
  {
    name: "cerebras",
    key: env.CEREBRAS_API_KEY,
    base: "https://api.cerebras.ai/v1",
    models: { reason: "gpt-oss-120b", fast: "llama-3.3-70b" },
  },
  {
    name: "groq",
    key: env.GROQ_API_KEY,
    base: "https://api.groq.com/openai/v1",
    models: { reason: "openai/gpt-oss-120b", fast: "qwen/qwen3.8-27b" },
  },
];

interface ChatOpts {
  tier: Tier;
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}

async function openaiChat(p: Provider, o: ChatOpts): Promise<string> {
  const res = await fetch(`${p.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: p.models[o.tier],
      messages: [
        ...(o.system ? [{ role: "system", content: o.system }] : []),
        { role: "user", content: o.prompt },
      ],
      temperature: o.json ? 0.35 : 0.8,
      max_tokens: o.maxTokens ?? 8192,
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 240)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error(`${p.name} empty response`);
  return text;
}

export async function chat(o: ChatOpts): Promise<string> {
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.key) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await openaiChat(p, o);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        if (/429|rate.?limit/i.test(msg) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 8000));
          continue;
        }
        break;
      }
    }
  }

  // Last resort: Gemini Flash (its own retry/backoff lives in gemini.ts).
  try {
    return await geminiGenerate({
      model: o.tier === "reason" ? "gemini-flash-latest" : "gemini-flash-lite-latest",
      system: o.system,
      prompt: o.prompt,
      json: o.json,
      maxOutputTokens: o.maxTokens,
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
  }
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
