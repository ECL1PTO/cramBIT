import { z } from "zod";

export type Coverage = "full" | "syllabus-only" | "new-course";

export interface Course {
  code: string;
  name: string;
  programs: string[];
  semester: number | null;
  credits: number | null;
  syllabus: string;
  campus: string;
  grounding: "full" | "partial" | "none";
  pyqCount: number;
}

export interface PastPaper {
  session: string;
  examType: string;
  maxMarks: number | null;
  durationHrs: number | null;
  questions: {
    number: string;
    marks: number | null;
    parts: { label: string; text: string; marks: number | null; topic?: string }[];
  }[];
  rawText?: string;
}

export interface PyqFile {
  courseCode: string;
  courseName: string;
  historical_papers: PastPaper[];
}

/** Pass 1 — analysis blueprint. */
export const BlueprintSchema = z.object({
  modules: z.array(
    z.object({
      title: z.string(),
      frequency: z.enum(["very-high", "high", "medium", "low"]),
      typicalMarks: z.number(),
      questionStems: z.array(z.string()).max(8),
      difficulty: z.enum(["recall", "apply", "analyse"]),
      lastAskedSession: z.string().default(""),
    }),
  ),
  coOccurring: z.array(z.array(z.string()).length(2)).max(8).default([]),
  repeats: z.array(z.string()).max(20).default([]), // near-verbatim recurring questions
  notes: z.string().default(""),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;

/** Pass 2 — ranked candidate question pool with evidence. */
export const CandidateSchema = z.object({
  module: z.string(),
  marks: z.union([z.literal(2), z.literal(3)]),
  text: z.string().min(10),
  probability: z.number().min(0).max(1),
  rationale: z.string().default(""), // which past years / patterns support this
});
export const CandidatePoolSchema = z.object({
  candidates: z.array(CandidateSchema).min(8),
});
export type Candidate = z.infer<typeof CandidateSchema>;

/** Pass 3 — assembled papers (one batch: 1–2 at a time). */
export const PredictedSetsSchema = z.object({
  sets: z.array(z.string().min(120)).min(1).max(4),
});
