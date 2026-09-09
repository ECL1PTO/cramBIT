import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Course, PyqFile } from "./types";
import coursesJson from "@/data/courses.json";
import indexJson from "@/data/index.json";

const DATA_DIR = path.join(process.cwd(), "src", "data");

// Loaded once per server instance.
const courses = coursesJson as Record<string, Course>;

interface CorpusEntry {
  code: string;
  name: string;
  dept?: string;
  program?: string;
  topics: string[];
  sessions: number;
}
interface IndexFile {
  courses: Record<string, { topicFreq?: Record<string, number>; stems?: string[] }>;
  corpus: CorpusEntry[];
}
const index = indexJson as IndexFile;

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function getCourse(input: string): Course | null {
  return courses[normalizeCode(input)] ?? null;
}

export function courseCount(): number {
  return Object.keys(courses).length;
}

export function allCourses(): Course[] {
  return Object.values(courses);
}

export function searchCourses(q: string, limit = 8): Course[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return Object.values(courses)
    .filter(
      (c) =>
        c.code.toLowerCase().includes(needle) ||
        c.name.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

export function getPyqs(code: string): PyqFile | null {
  const file = path.join(DATA_DIR, "pyqs", `${normalizeCode(code)}.json`);
  try {
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as PyqFile;
    if (!parsed.historical_papers?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function indexedPaperCount(): number {
  return index.corpus.reduce((n, c) => n + (c.sessions ?? 0), 0);
}

export function topicFreqFor(code: string): Record<string, number> | undefined {
  return index.courses[normalizeCode(code)]?.topicFreq;
}

/**
 * For a new / PYQ-less course, find the most similar courses in the whole
 * archive corpus by keyword overlap against the provided syllabus text.
 */
export function similarCourses(syllabus: string, k = 4): CorpusEntry[] {
  const terms = new Set(
    syllabus
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4),
  );
  if (!terms.size || !index.corpus.length) return [];
  return index.corpus
    .map((entry) => ({
      entry,
      score: entry.topics.reduce(
        (s, t) => s + (terms.has(t.toLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.entry);
}

export function borrowedPyqs(codes: string[]): PyqFile[] {
  return codes
    .map((c) => getPyqs(c))
    .filter((x): x is PyqFile => x !== null);
}
