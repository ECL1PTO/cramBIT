import type { Blueprint, Coverage, PastPaper } from "./types";
import { PAPER_FOOTER } from "@/data/legal";

const EXAM_RULES = `
BIT Mesra (Noida campus) MID-SEMESTER format — non-negotiable:
- Max Marks: exactly 25. Time: 1.5 hours.
- Exactly 5 questions. "Attempt all 5 questions. Each question carries 5 marks."
- Every question has two parts: (a) worth 2 marks, (b) worth 3 marks. 2 + 3 = 5.
- Every sub-question must be answerable purely from the syllabus given. If a topic is not
  in the syllabus, you may not ask about it. This is absolute.
- Questions must be concrete and examinable (a real question a professor would set), not
  vague prompts like "Explain Module 1".
`;

export function analysisPrompt(args: {
  courseName: string;
  syllabus: string;
  coverage: Coverage;
  ownPapers: PastPaper[];
  borrowedPapers: { code: string; name: string; papers: PastPaper[] }[];
}): string {
  const own = args.ownPapers
    .map(
      (p) =>
        `[${p.session} ${p.examType}]\n${
          p.rawText ??
          p.questions
            .map(
              (q) =>
                `${q.number}. ` +
                q.parts.map((x) => `(${x.label}) ${x.text} [${x.marks}]`).join(" "),
            )
            .join("\n")
        }`,
    )
    .join("\n\n");

  const borrowed = args.borrowedPapers
    .map(
      (b) =>
        `--- similar course ${b.code} (${b.name}) ---\n` +
        b.papers
          .map(
            (p) =>
              `[${p.session}] ` +
              p.questions
                .map((q) => q.parts.map((x) => x.text).join(" / "))
                .join(" | "),
          )
          .join("\n"),
    )
    .join("\n\n");

  return `You are cramBIT's exam-pattern analyst. Build a prediction blueprint for the
mid-sem of "${args.courseName}".

SYLLABUS (the only allowed scope):
${args.syllabus}

${
  args.ownPapers.length
    ? `THIS COURSE'S REAL PAST MID-SEM PAPERS:\n${own}`
    : `No past papers exist for this exact course. Use the related-course papers below as the
pattern signal, mapped onto this syllabus.`
}
${borrowed ? `\nRELATED-COURSE PAST PAPERS (pattern reference only):\n${borrowed}` : ""}

TASK: Return JSON only:
{
  "modules": [
    { "title": "<syllabus module/topic>",
      "frequency": "very-high|high|medium|low",   // how often it is examined
      "typicalMarks": <number>,                    // usual marks it carries in a mid-sem
      "questionStems": ["<recurring phrasings a professor uses>"],
      "difficulty": "recall|apply|analyse" }
  ],
  "coOccurring": [["<moduleA>","<moduleB>"]],       // pairs that tend to share one paper
  "notes": "<1-2 sentences on the overall pattern>"
}
Base frequency on real evidence, not guessing. Cover every syllabus module.`;
}

export function predictionPrompt(args: {
  courseCode: string;
  courseName: string;
  syllabus: string;
  blueprint: Blueprint;
  setCount: number;
}): string {
  return `You are cramBIT's paper writer. Using the blueprint, write ${args.setCount} DISTINCT
predicted mid-sem papers for ${args.courseCode} — ${args.courseName}.

${EXAM_RULES}

BLUEPRINT:
${JSON.stringify(args.blueprint)}

SYLLABUS:
${args.syllabus}

RULES:
- Every set must include the "very-high" and "high" frequency modules.
- Rotate the "medium"/"low" modules across the sets so the ${args.setCount} papers are
  genuinely different, not paraphrases.
- Use the blueprint's question stems and difficulty as a guide.
- Each set is GitHub-flavoured Markdown, formatted EXACTLY:

<div align="center">
<b>BIRLA INSTITUTE OF TECHNOLOGY, MESRA — NOIDA CAMPUS</b><br/>
<b>MID-SEMESTER EXAMINATION (PREDICTED)</b>
</div>

**Course:** ${args.courseCode} — ${args.courseName}
**Time:** 1.5 Hours  |  **Max Marks:** 25

---

**Attempt all 5 questions. Each question carries 5 marks.**

**Q1.**

**(a)** <question> _(2 Marks)_

**(b)** <question> _(3 Marks)_

**Q2.**
... (Q2–Q5 same shape)

---

_${PAPER_FOOTER}_

Return JSON only: { "sets": ["<markdown set 1>", "<markdown set 2>", ...] }`;
}

export function validationPrompt(set: string, syllabus: string): string {
  return `Check this predicted mid-sem paper. Return JSON only:
{ "ok": <bool>, "problems": ["..."] }

Fail (ok:false) if ANY of: not exactly 5 questions; a question's parts are not (a)=2 and
(b)=3 marks; total is not 25; a sub-question needs knowledge outside the syllabus; two
sub-questions are duplicates.

SYLLABUS:
${syllabus}

PAPER:
${set}`;
}
