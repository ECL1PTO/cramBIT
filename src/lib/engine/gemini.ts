import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";

const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const MODELS = {
  reason: "gemini-pro-latest", // analysis + prediction passes
  fast: "gemini-flash-latest", // validation, tutor
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
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
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
