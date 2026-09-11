// Extract the BIT Noida course catalogue from the structure PDFs in
// project_reference/syllabus_pdfs/ (pdf-parse text -> Groq JSON).
//   node scripts/scrape-courses.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT, groqJson, pdfText, writeJson, sleep } from "./lib.mjs";

const SRC_DIR = path.join(ROOT, "project_reference", "syllabus_pdfs");

const SYSTEM = "You extract structured course catalogues from university documents. JSON only.";
const prompt = (text) => `From this BIT Mesra (Noida campus) programme structure document,
extract every real course. Return JSON:
{ "program": "<BCA|BBA|MCA|MBA|BSc-CS|BSc-AIDS|BSc-AM|BCom|...>",
  "courses": [ { "code": "<course code>", "name": "<title>", "semester": <int|null>,
                 "credits": <number|null>, "syllabus": "<module-wise syllabus text if present, else \\"\\">" } ] }
Skip rows without a real course code (projects, seminars, electives-placeholder).

DOCUMENT:
${text.slice(0, 40000)}`;

const files = fs.readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
// Authoritative source = the Noida structure PDFs. Start fresh each run so
// stale/unverified codes don't linger.
const merged = {};

for (const file of files) {
  console.log("→", file);
  try {
    const { text } = await pdfText(path.join(SRC_DIR, file));
    if (text.trim().length < 200) {
      console.log("  (no text layer — skipped; needs OCR)");
      continue;
    }
    const out = await groqJson(SYSTEM, prompt(text));
    for (const c of out.courses ?? []) {
      const code = String(c.code || "").toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z]{2}\d{2,6}$/.test(code)) continue;
      const prev = merged[code] ?? {
        code, name: c.name || code, programs: [], semester: null, credits: null,
        syllabus: "", campus: "Noida", grounding: "none", pyqCount: 0,
      };
      merged[code] = {
        ...prev,
        name: c.name || prev.name,
        semester: c.semester ?? prev.semester,
        credits: c.credits ?? prev.credits,
        syllabus:
          c.syllabus && c.syllabus.length > (prev.syllabus?.length ?? 0)
            ? c.syllabus
            : prev.syllabus,
        programs: [...new Set([...prev.programs, out.program].filter(Boolean))],
      };
    }
    console.log(`  +${out.courses?.length ?? 0} courses`);
  } catch (e) {
    console.error("  failed:", e.message);
  }
  writeJson("src/data/courses.json", merged);
  await sleep(1000);
}

console.log("total courses:", Object.keys(merged).length);
