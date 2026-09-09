import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// The project's API key is on the free tier, which does NOT grant the -pro
// models (limit: 0). flash-latest currently resolves to gemini-3.8-flash and
// is strong enough for the multi-pass design. Swap to a -pro model here if the
// key ever gets paid billing.
export const MODELS = {
  reason: "gemini-flash-latest", // analysis + prediction passes
  fast: "gemini-flash-lite-latest", // validation, tutor
} as const;

interface GenOpts {
  model: string;
  system?: string;
  prompt: string;
  json?: boolean;
  maxOutputTokens?: number;
}

export async function generate({
  model,
  system,
  prompt,
  json = false,
  maxOutputTokens = 8192,
}: GenOpts): Promise<string> {
  const m = client.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: {
      maxOutputTokens,
      temperature: json ? 0.4 : 0.8,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await m.generateContent(prompt);
      const text = res.response.text();
      if (text?.trim()) return text;
      throw new Error("empty response");
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryMatch = msg.match(/retry in ([\d.]+)s/i);
      const wait = retryMatch
        ? Math.min(Number(retryMatch[1]) * 1000 + 500, 40000)
        : 400 * (attempt + 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(
    `Gemini failed after retries: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}
