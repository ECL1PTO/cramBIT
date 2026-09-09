// Build src/data/index.json (per-course pattern stats + global similarity corpus)
// and refresh grounding / pyqCount on src/data/courses.json.
//
//   node scripts/build-index.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson, readJson } from "./lib.mjs";

const courses = readJson("src/data/courses.json", {}) ?? {};
const rawCorpus = readJson("src/data/pyq_corpus.json", []) ?? [];

// Collapse corpus entries to one row per course.
const corpusByCode = {};
for (const c of rawCorpus) {
  if (!c.code || c.empty || c.error) continue;
  const row = (corpusByCode[c.code] ??= {
    code: c.code,
    name: c.name || "",
    dept: c.dept,
    topics: new Set(),
    sessions: 0,
  });
  (c.topics || []).forEach((t) => row.topics.add(String(t).toLowerCase()));
  row.sessions += c.sessions || 0;
}
const corpus = Object.values(corpusByCode).map((r) => ({
  ...r,
  topics: [...r.topics],
}));

// Per-course topic frequency from the actual pyqs/<CODE>.json files.
const perCourse = {};
const pyqDir = path.join(ROOT, "src", "data", "pyqs");
for (const file of fs.existsSync(pyqDir) ? fs.readdirSync(pyqDir) : []) {
  if (!file.endsWith(".json")) continue;
  const data = readJson(`src/data/pyqs/${file}`, null);
  if (!data?.historical_papers?.length) continue;
  const code = data.courseCode;
  const freq = {};
  const stems = new Set();
  let sessions = 0;
  for (const paper of data.historical_papers) {
    sessions++;
    for (const q of paper.questions || []) {
      for (const p of q.parts || []) {
        if (p.topic) freq[p.topic.toLowerCase()] = (freq[p.topic.toLowerCase()] || 0) + 1;
        const stem = (p.text || "").split(/[.?]/)[0]?.trim().slice(0, 80);
        if (stem) stems.add(stem);
      }
    }
  }
  perCourse[code] = { topicFreq: freq, stems: [...stems].slice(0, 40) };

  if (courses[code]) {
    courses[code].pyqCount = sessions;
    courses[code].grounding = sessions >= 2 ? "full" : sessions === 1 ? "partial" : "none";
  }
}

writeJson("src/data/index.json", { courses: perCourse, corpus });
writeJson("src/data/courses.json", courses);
console.log(`index: ${Object.keys(perCourse).length} grounded courses, ${corpus.length} corpus rows`);
