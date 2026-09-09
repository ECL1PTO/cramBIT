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

  // Ordered best → worst for exam-paper prediction. Groq first (fast, strong),
  // then OpenRouter, then Cerebras. Each slot has its own daily budget.
  if (tier === "reason") {
    return [
      groq("openai/gpt-oss-120b"),
      or("nvidia/nemotron-3-super-120b-a12b:free"),
      or("nex-agi/nex-n2.5-pro:free"),
      groq("qwen/qwen3.8-27b"),
      groq("openai/gpt-oss-20b"),
      cerebras("gpt-oss-120b"),
      or("google/gemma-4-31b-it:free"),
    ];
  }
  return [
    groq("openai/gpt-oss-20b"),
    or("nex-agi/nex-n2.5-mini:free"),
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
    signal: AbortSignal.timeout(45_000),
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

/** Plain text — first provider that answers wins. */
export async function chat(o: ChatOpts): Promise<string> {
  const errors: string[] = [];
  for (const a of [...chainFor(o.tier), null]) {
    try {
      if (a) {
        if (!a.key) continue;
        return await callOpenAICompatible(a, o);
      }
      return await geminiGenerate({
        model: o.tier === "reason" ? "gemini-flash-latest" : "gemini-flash-lite-latest",
        system: o.system,
        prompt: o.prompt,
        json: o.json,
        maxOutputTokens: o.maxTokens,
      });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`All LLM providers exhausted: ${errors.join(" | ")}`);
}

/**
 * JSON with validation — walks the provider chain until one returns output that
 * both parses AND passes `validate`. Bad JSON from a free model just moves on.
 */
export async function chatJson<T>(
  o: ChatOpts,
  validate: (v: unknown) => T,
): Promise<T> {
  const errors: string[] = [];
  const attempts = [...chainFor(o.tier), null];
  for (const a of attempts) {
    try {
      let raw: string;
      if (a) {
        if (!a.key) continue;
        raw = await callOpenAICompatible(a, { ...o, json: true });
      } else {
        raw = await geminiGenerate({
          model: o.tier === "reason" ? "gemini-flash-latest" : "gemini-flash-lite-latest",
          system: o.system,
          prompt: o.prompt,
          json: true,
          maxOutputTokens: o.maxTokens,
        });
      }
      return validate(parseJson<unknown>(raw));
    } catch (err) {
      errors.push(`${a ? a.provider + "/" + a.model : "gemini"}: ${err instanceof Error ? err.message : err}`);
    }
  }
  throw new Error(`No provider produced valid JSON: ${errors.join(" | ")}`);
}

export function parseJson<T>(raw: string): T {
  const s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    // Free models sometimes wrap JSON in prose or trailing reasoning. Pull the
    // outermost balanced {...} or [...] and parse that.
    const open = s.search(/[{[]/);
    if (open === -1) throw new Error("no JSON in response");
    const openCh = s[open];
    const closeCh = openCh === "{" ? "}" : "]";
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      if (s[i] === openCh) depth++;
      else if (s[i] === closeCh && --depth === 0) {
        return JSON.parse(s.slice(open, i + 1)) as T;
      }
    }
    throw new Error("unbalanced JSON in response");
  }
}
