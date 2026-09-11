import "server-only";
import { env } from "@/lib/env";
import { generate as geminiGenerate } from "./gemini";

/**
 * Text-reasoning LLM for the prediction engine.
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

function gatewayAttempt(tier: Tier): Attempt | null {
  if (!env.LLM_GATEWAY_URL || !env.LLM_GATEWAY_KEY) return null;
  return {
    provider: "openrouter",
    base: env.LLM_GATEWAY_URL.replace(/\/+$/, ""),
    key: env.LLM_GATEWAY_KEY,
    model:
      tier === "fast"
        ? env.LLM_GATEWAY_MODEL_FAST ?? env.LLM_GATEWAY_MODEL
        : env.LLM_GATEWAY_MODEL,
  };
}

function chainFor(tier: Tier): Attempt[] {
  const gw = gatewayAttempt(tier);
  if (gw) return [gw]; // gateway does its own multi-provider routing
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

async function callOpenAICompatible(
  a: Attempt,
  o: ChatOpts,
  timeoutMs = 45_000,
): Promise<string> {
  const res = await fetch(`${a.base}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
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
      // gpt-oss / reasoning models spend hidden "reasoning" tokens out of the
      // completion budget before the answer — keep that cheap so the JSON or
      // paper actually fits. OpenAI-compatible servers ignore unknown fields.
      reasoning_effort: "low",
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

// Each generation phase (plan / pool / write) is its own 60s serverless call,
// so the chain has almost the full budget. Stop before the hard limit so we
// return a clean "at capacity" instead of a raw 504.
const CHAIN_DEADLINE_MS = 55_000;

/** Plain text — first provider that answers wins. */
export async function chat(o: ChatOpts): Promise<string> {
  const errors: string[] = [];
  const started = Date.now();
  // A gateway attempt cascades through providers internally — don't cut it
  // off early, let it use most of the deadline. A direct provider is fast,
  // so cap it to leave room for the next one in the chain.
  const isGateway = Boolean(env.LLM_GATEWAY_URL && env.LLM_GATEWAY_KEY);
  for (const a of [...chainFor(o.tier), null]) {
    const left = CHAIN_DEADLINE_MS - (Date.now() - started);
    if (left < 4000) break;
    try {
      if (a) {
        if (!a.key) continue;
        return await callOpenAICompatible(a, o, Math.min(left, isGateway ? 50_000 : 42_000));
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
const JSON_SYSTEM =
  "You output only a single raw JSON value. No prose, no reasoning, no <think> blocks, " +
  "no markdown code fences — the response must start with { or [ and end with the matching " +
  "bracket. Think silently.";

export async function chatJson<T>(
  o: ChatOpts,
  validate: (v: unknown) => T,
): Promise<T> {
  const errors: string[] = [];
  const started = Date.now();
  const attempts = [...chainFor(o.tier), null];
  // A gateway attempt already does its own multi-provider cascade internally
  // (that's the whole point of OmniRoute) — cutting it off early to "retry"
  // just interrupts it mid-cascade and wastes the interruption on a second,
  // even-shorter attempt. Give it one try with almost the whole deadline.
  // A direct provider is fast but stochastic about honouring "JSON only", so
  // a quick second try there is worth it.
  const isGateway = Boolean(env.LLM_GATEWAY_URL && env.LLM_GATEWAY_KEY);
  const TRIES_PER_PROVIDER = isGateway ? 1 : 2;
  const jo: ChatOpts = {
    ...o,
    json: true,
    system: o.system ? `${JSON_SYSTEM}\n\n${o.system}` : JSON_SYSTEM,
    // Headroom for low-effort reasoning tokens that count against completion.
    maxTokens: Math.max(o.maxTokens ?? 0, 3200),
  };

  for (const a of attempts) {
    if (a && !a.key) continue;
    for (let t = 0; t < (a ? TRIES_PER_PROVIDER : 1); t++) {
      const left = CHAIN_DEADLINE_MS - (Date.now() - started);
      if (left < 8000) break; // not enough time for another call — fall through
      try {
        const raw = a
          ? await callOpenAICompatible(a, jo, Math.min(left, isGateway ? 50_000 : 40_000))
          : await geminiGenerate({
              model: o.tier === "reason" ? "gemini-flash-latest" : "gemini-flash-lite-latest",
              system: jo.system,
              prompt: o.prompt,
              json: true,
              maxOutputTokens: jo.maxTokens,
            });
        return validate(parseJson<unknown>(raw));
      } catch (err) {
        errors.push(
          `${a ? a.provider + "/" + a.model : "gemini"}#${t}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
  throw new Error(`capacity — no provider produced valid JSON: ${errors.join(" | ")}`);
}

export function parseJson<T>(raw: string): T {
  const s = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // reasoning-model scratchpad
    .replace(/<\|[^|]*\|>/g, "") // chat control tokens
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
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
