// Turn downloaded PYQ PDFs into structured question banks via Gemini.
// Reads project_reference/pyq_manifest.json, writes src/data/pyqs/<CODE>.json
// and a topic-tagged corpus at src/data/pyq_corpus.json. Resumable.
//
//   node scripts/extract-pyqs.mjs
import path from "node:path";
import { ROOT, askJson, pdfPart, writeJson, readJson, sleep } from "./lib.mjs";

const manifest = readJson("project_reference/pyq_manifest.json", {}) ?? {};
const corpus = readJson("src/data/pyq_corpus.json", []) ?? [];
const done = new Set(corpus.map((c) => c.key));

const PROMPT = `Extract this university exam question paper. Return JSON:
{
  "courseCode": "<code>", "courseName": "<title>", "session": "<e.g. Monsoon 2022>",
  "examType": "MID|END", "maxMarks": <int>, "durationHrs": <number|null>,
  "questions": [
    { "number": "Q1", "marks": <int|null>,
      "parts": [ { "label": "a", "text": "<question text>", "marks": <int|null>,
                   "topic": "<short topic keyword>" } ] }
  ],
  "topics": ["<all distinct topic keywords in this paper>"]
}
Transcribe question text faithfully. If the scan is unreadable, return {"questions":[]}.`;

const byCode = {};

for (const [key, m] of Object.entries(manifest)) {
  if (!m.downloaded || m.examType === "OTHER") continue;
  if (done.has(key)) continue;

  const abs = path.join(ROOT, "project_reference", "pyq_pdfs", m.dept, m.name);
  console.log("→", key);
  try {
    const out = await askJson(PROMPT, [pdfPart(abs)]);
    if (!out.questions?.length) {
      corpus.push({ key, code: m.code, dept: m.dept, topics: [], sessions: 0, empty: true });
    } else {
      const code = (out.courseCode || m.code || "UNKNOWN").toUpperCase().replace(/\s+/g, "");
      byCode[code] ??= readJson(`src/data/pyqs/${code}.json`, {
        courseCode: code,
        courseName: out.courseName || "",
        historical_papers: [],
      });
      byCode[code].historical_papers.push({
        session: out.session || "unknown",
        examType: out.examType || m.examType,
        maxMarks: out.maxMarks ?? null,
        durationHrs: out.durationHrs ?? null,
        questions: out.questions,
      });
      corpus.push({
        key,
        code,
        name: out.courseName || "",
        dept: m.dept,
        topics: out.topics || [],
        sessions: 1,
      });
    }
  } catch (e) {
    console.error("  failed:", e.message);
    corpus.push({ key, code: m.code, dept: m.dept, topics: [], sessions: 0, error: e.message });
  }

  for (const [code, data] of Object.entries(byCode)) writeJson(`src/data/pyqs/${code}.json`, data);
  writeJson("src/data/pyq_corpus.json", corpus);
  await sleep(1200);
}

console.log("extract complete");
