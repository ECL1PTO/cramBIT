// Build src/data/index.json — per-course keyword frequency + a global
// similarity corpus, straight from the raw PYQ text. No LLM.
//
//   node scripts/build-index.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson, readJson } from "./lib.mjs";

const STOP = new Set(
  ("the a an and or of to in for on with as by is are be at from that this it which "
    + "marks question questions answer all attempt each following give explain define write "
    + "state discuss describe what how why hours max semester examination mid birla institute "
    + "technology mesra noida ranchi time paper papers course code section part any two three "
    + "four five class branch session subject full instructions contains total missing assumed "
    + "suitably tables handbook graph applicable will shall supplied candidates draw various "
    + "suitable roll duration note figures right indicate standard data assume year years "
    + "student students university department programme program degree bachelor master "
    + "spring monsoon autumn winter maximum minimum below above given also using use used "
    + "following unless otherwise stated required carry equal weightage compulsory").split(
    /\s+/,
  ),
);

function keywords(text, n = 40) {
  const freq = {};
  for (const w of text.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/)) {
    if (w.length < 4 || STOP.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

const courses = readJson("src/data/courses.json", {}) ?? {};
const rawCorpus = readJson("src/data/pyq_corpus.json", []) ?? [];

// similarity corpus: one row per course
const byCode = {};
for (const c of rawCorpus) {
  const row = (byCode[c.code] ??= { code: c.code, dept: c.dept, sessions: 0, text: "" });
  row.sessions++;
  row.text += " " + c.text;
}
const corpus = Object.values(byCode).map((r) => ({
  code: r.code,
  dept: r.dept,
  sessions: r.sessions,
  topics: keywords(r.text, 30).map(([w]) => w),
}));

// per-course stats + refresh grounding on courses.json
const perCourse = {};
const pyqDir = path.join(ROOT, "src", "data", "pyqs");
for (const file of fs.existsSync(pyqDir) ? fs.readdirSync(pyqDir) : []) {
  if (!file.endsWith(".json")) continue;
  const data = readJson(`src/data/pyqs/${file}`, null);
  const papers = data?.historical_papers ?? [];
  if (!papers.length) continue;
  const code = data.courseCode;
  const all = papers.map((p) => p.rawText || "").join(" ");
  perCourse[code] = {
    topicFreq: Object.fromEntries(keywords(all, 30)),
    sessions: papers.length,
  };
  if (courses[code]) {
    courses[code].pyqCount = papers.length;
    courses[code].grounding = papers.length >= 2 ? "full" : "partial";
  }
}

writeJson("src/data/index.json", { courses: perCourse, corpus });
writeJson("src/data/courses.json", courses);
console.log(
  `index: ${Object.keys(perCourse).length} grounded courses, ${corpus.length} corpus rows`,
);
