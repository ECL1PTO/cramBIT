// Turn downloaded PYQ PDFs into structured question banks (pdf-parse -> Groq).
// Reads project_reference/pyq_manifest.json; writes src/data/pyqs/<CODE>.json
// and src/data/pyq_corpus.json. Resumable. Skips scanned PDFs with no text layer
// (listed at the end for optional OCR).
//   node scripts/extract-pyqs.mjs
import path from "node:path";
import { ROOT, groqJson, pdfText, writeJson, readJson, sleep } from "./lib.mjs";

const manifest = readJson("project_reference/pyq_manifest.json", {}) ?? {};
const corpus = readJson("src/data/pyq_corpus.json", []) ?? [];
const seen = new Set(corpus.map((c) => c.key));

const SYSTEM = "You transcribe university exam papers into structured JSON. JSON only.";
const prompt = (text) => `Extract this exam question paper. Return JSON:
{ "courseCode": "<code>", "courseName": "<title>", "session": "<e.g. Monsoon 2022>",
  "examType": "MID|END", "maxMarks": <int|null>, "durationHrs": <number|null>,
  "questions": [ { "number": "Q1", "marks": <int|null>,
    "parts": [ { "label": "a", "text": "<question text>", "marks": <int|null>, "topic": "<keyword>" } ] } ],
  "topics": ["<distinct topic keywords in this paper>"] }
Transcribe faithfully. If unreadable, return {"questions":[],"topics":[]}.

PAPER TEXT:
${text.slice(0, 24000)}`;

const scanned = [];

for (const [key, m] of Object.entries(manifest)) {
  if (!m.downloaded || m.examType === "OTHER" || seen.has(key)) continue;
  const abs = path.join(ROOT, "project_reference", "pyq_pdfs", m.dept, m.name);
  console.log("→", key);
  try {
    const { text } = await pdfText(abs);
    if (text.trim().length < 150) {
      scanned.push(key);
      corpus.push({ key, code: m.code, dept: m.dept, topics: [], sessions: 0, scanned: true });
      writeJson("src/data/pyq_corpus.json", corpus);
      continue;
    }
    const out = await groqJson(SYSTEM, prompt(text));
    if (!out.questions?.length) {
      corpus.push({ key, code: m.code, dept: m.dept, topics: [], sessions: 0, empty: true });
    } else {
      const code = (out.courseCode || m.code || "UNKNOWN").toUpperCase().replace(/\s+/g, "");
      const file = `src/data/pyqs/${code}.json`;
      const data = readJson(file, { courseCode: code, courseName: out.courseName || "", historical_papers: [] });
      data.historical_papers.push({
        session: out.session || "unknown",
        examType: out.examType || m.examType,
        maxMarks: out.maxMarks ?? null,
        durationHrs: out.durationHrs ?? null,
        questions: out.questions,
      });
      writeJson(file, data);
      corpus.push({ key, code, name: out.courseName || "", dept: m.dept, topics: out.topics || [], sessions: 1 });
    }
    writeJson("src/data/pyq_corpus.json", corpus);
  } catch (e) {
    console.error("  failed:", e.message);
    corpus.push({ key, code: m.code, dept: m.dept, topics: [], sessions: 0, error: e.message });
  }
  await sleep(800);
}

if (scanned.length) {
  writeJson("project_reference/scanned_pdfs.json", scanned);
  console.log(`\n${scanned.length} scanned PDFs skipped (no text layer) — see scanned_pdfs.json`);
}
console.log("extract complete");
