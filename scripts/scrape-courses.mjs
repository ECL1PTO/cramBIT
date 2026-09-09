// Extract the BIT Noida course catalogue from the structure PDFs in
// project_reference/syllabus_pdfs/ using Gemini. Writes src/data/courses.json.
//
//   node scripts/scrape-courses.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT, askJson, pdfPart, writeJson, readJson, sleep } from "./lib.mjs";

const SRC_DIR = path.join(ROOT, "project_reference", "syllabus_pdfs");

const PROMPT = `You are extracting a course catalogue from a BIT Mesra (Noida campus)
programme structure document. Return JSON:
{
  "program": "<BCA|BBA|MCA|MBA|BSc-CS|BSc-AIDS|BSc-AM|BCom|...>",
  "courses": [
    { "code": "<official course code, e.g. CA25121>",
      "name": "<course title>",
      "semester": <int or null>,
      "credits": <number or null>,
      "syllabus": "<module-wise syllabus text if the document contains it, else \\"\\">" }
  ]
}
Only include real courses with a code. Ignore project/seminar rows without a code.`;

const files = fs.readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
const merged = readJson("src/data/courses.json", {}) ?? {};

for (const file of files) {
  console.log("→", file);
  try {
    const out = await askJson(PROMPT, [pdfPart(path.join(SRC_DIR, file))]);
    for (const c of out.courses ?? []) {
      const code = String(c.code || "").toUpperCase().replace(/\s+/g, "");
      if (!code) continue;
      const prev = merged[code] ?? {
        code,
        name: c.name || code,
        programs: [],
        semester: null,
        credits: null,
        syllabus: "",
        campus: "Noida",
        grounding: "none",
        pyqCount: 0,
      };
      merged[code] = {
        ...prev,
        name: c.name || prev.name,
        semester: c.semester ?? prev.semester,
        credits: c.credits ?? prev.credits,
        syllabus: (c.syllabus && c.syllabus.length > prev.syllabus.length) ? c.syllabus : prev.syllabus,
        programs: [...new Set([...prev.programs, out.program].filter(Boolean))],
      };
    }
  } catch (e) {
    console.error("  failed:", e.message);
  }
  await sleep(1500);
}

writeJson("src/data/courses.json", merged);
console.log("total courses:", Object.keys(merged).length);
