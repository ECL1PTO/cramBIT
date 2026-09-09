import "server-only";
import { env } from "@/lib/env";
import { generate as geminiGenerate } from "./gemini";

/**
 * Text-reasoning LLM for the engine and tutor.
 *
 * Free-tier LLMs each have a small daily budget, so we chain across several
 * providers/models — each has its own quota, so total capacity multiplies.
 * Order per tier is best-quality first. Gemini Flash is the final fallback.
 *
 * For real launch traffic, add ONE paid key (OpenRouter $10 credit → 1000/day,
 * or Gemini API billing) and it stops mattering.
 */

type Tier = "reason" | "fast";

interface Attempt {
  provider: "openrouter" | "groq" | "cerebras";
  base: string;
  key: string | undefined;
  model: string;
  extraHeaders?: Record<string, string>;
}

function chainFor(tier: Tier): Attempt[] {
  const or = (model: string): Attempt => ({
    provider: "openrouter",
    base: "https://openrouter.ai/api/v1",
    key: env.OPENROUTER_API_KEY,
    model,
    extraHeaders: {
      "HTTP-Referer": env.NEXT_PUBLIC_SITE_URL,
      "X-Title": "cramBIT",
    },
  });
  const groq = (model: string): Attempt => ({
    provider: "groq",
    base: "https://api.groq.com/openai/v1",
    key: env.GROQ_API_KEY,
    model,
  });
  const cerebras = (model: string): Attempt => ({
    provider: "cerebras",
    base: "https://api.cerebras.ai/v1",
    key: env.CEREBRAS_API_KEY,
    model,
  });

  if (tier === "reason") {
    return [
      or("deepseek/deepseek-chat-v3.1:free"),
      groq("openai/gpt-oss-120b"),
      groq("llama-3.3-70b-versatile"),
      cerebras("gpt-oss-120b"),
      or("meta-llama/llama-3.3-70b-instruct:free"),
    ];
  }
  return [
    groq("llama-3.1-8b-instant"),
    or("meta-llama/llama-3.3-70b-instruct:free"),
    groq("qwen/qwen3.8-27b"),
  ];
}

interface ChatOpts {
  tier: Tier;
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}

async function callOpenAICompatible(a: Attempt, o: ChatOpts): Promise<string> {
  const res = await fetch(`${a.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${a.key}`,
      "Content-Type": "application/json",
      ...a.extraHeaders,
    },
    body: JSON.stringify({
      model: a.model,
      messages: [
        ...(o.system ? [{ role: "system", content: o.system }] : []),
        { role: "user", content: o.prompt },
      ],
      temperature: o.json ? 0.35 : 0.8,
      max_tokens: o.maxTokens ?? 6000,
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`${a.provider}/${a.model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error(`${a.provider} empty response`);
  return text;
}

export async function chat(o: ChatOpts): Promise<string> {
  const errors: string[] = [];
  for (const a of chainFor(o.tier)) {
    if (!a.key) continue;
    try {
      return await callOpenAICompatible(a, o);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

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
    throw new Error(`All LLM providers exhausted: ${errors.join(" | ")}`);
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
