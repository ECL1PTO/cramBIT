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

/** LLM analysis-pass output. */
export const BlueprintSchema = z.object({
  modules: z.array(
    z.object({
      title: z.string(),
      frequency: z.enum(["very-high", "high", "medium", "low"]),
      typicalMarks: z.number(),
      questionStems: z.array(z.string()).max(6),
      difficulty: z.enum(["recall", "apply", "analyse"]),
    }),
  ),
  coOccurring: z.array(z.array(z.string()).length(2)).max(6).default([]),
  notes: z.string().default(""),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;

/** LLM prediction-pass output. */
export const PredictedSetsSchema = z.object({
  sets: z.array(z.string().min(120)).min(3).max(4),
});
