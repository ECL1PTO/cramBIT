// Shared helpers for the offline data pipeline. Run with: node scripts/<name>.mjs
import fs from "node:fs";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const KEY = process.env.GEMINI_API_KEY ?? readEnvLocal().GEMINI_API_KEY;
if (!KEY) throw new Error("GEMINI_API_KEY missing (set env or .env.local)");

export const ROOT = process.cwd();
export const genAI = new GoogleGenerativeAI(KEY);
// Free-tier key: -pro models are blocked (limit 0). flash-latest works.
export const MODEL = "gemini-flash-latest";

export function readEnvLocal() {
  try {
    const txt = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
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

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function askJson(prompt, parts = []) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 32000 },
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await model.generateContent([prompt, ...parts]);
      const raw = res.response.text().trim().replace(/^```json/i, "").replace(/```$/, "");
      return JSON.parse(raw);
    } catch (err) {
      const msg = String(err?.message ?? err);
      const m = msg.match(/retry in ([\d.]+)s/i);
      if ((m || /429|503/.test(msg)) && attempt < 5) {
        const wait = m ? Number(m[1]) * 1000 + 1000 : 5000 * (attempt + 1);
        console.log(`  rate-limited, waiting ${Math.round(wait / 1000)}s…`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

export function pdfPart(filePath) {
  return {
    inlineData: {
      mimeType: "application/pdf",
      data: fs.readFileSync(filePath).toString("base64"),
    },
  };
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
