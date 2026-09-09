// Shared helpers for the offline data pipeline. Run: node scripts/<name>.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const ROOT = process.cwd();

export function readEnvLocal() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    return Object.fromEntries(
      txt
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const ENV = { ...readEnvLocal(), ...process.env };
const GROQ_KEY = ENV.GROQ_API_KEY;
if (!GROQ_KEY) throw new Error("GROQ_API_KEY missing (env or .env.local)");

export const MODEL = "openai/gpt-oss-120b";

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function groqJson(system, prompt) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 16000,
          response_format: { type: "json_object" },
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        const wait = Number(res.headers.get("retry-after")) * 1000 || 8000 * (attempt + 1);
        if (res.status === 429 && attempt < 6) {
          console.log(`  rate-limited, waiting ${Math.round(wait / 1000)}s…`);
          await sleep(wait);
          continue;
        }
        throw new Error(JSON.stringify(j).slice(0, 300));
      }
      return JSON.parse(j.choices[0].message.content);
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(4000 * (attempt + 1));
    }
  }
}

export async function pdfText(filePath) {
  const data = await pdfParse(fs.readFileSync(filePath));
  return { text: data.text ?? "", pages: data.numpages ?? 0 };
}

export function writeJson(rel, data) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(data, null, 2));
  console.log("wrote", rel);
}

export function readJson(rel, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch {
    return fallback;
  }
}
