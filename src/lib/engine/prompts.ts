import type { Blueprint, Candidate, Coverage, PastPaper } from "./types";
import { PAPER_FOOTER } from "@/data/legal";

const EXAM_RULES = `
BIT Mesra (Noida campus) MID-SEMESTER format — non-negotiable:
- Max Marks: exactly 25. Time: 1.5 hours.
- Exactly 5 questions. "Attempt all 5 questions. Each question carries 5 marks."
- Every question has two parts: (a) worth 2 marks, (b) worth 3 marks. 2 + 3 = 5.
- Every sub-question must be answerable purely from the syllabus given. Nothing out of syllabus.
- Questions must be concrete and examinable — a real question a professor would set.
`;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

function renderPapers(papers: PastPaper[], budgetChars = 5200): string {
  const rendered = papers.slice(0, 6).map((p) => {
    const body =
      p.questions
        .map(
          (q) =>
            `${q.number}. ` +
            q.parts.map((x) => `(${x.label}) [${x.marks ?? "?"}m] ${x.text}`).join("  "),
        )
        .join("\n") || clip(p.rawText?.trim() ?? "", 1500);
    return `### ${p.session} — ${p.examType} (max ${p.maxMarks ?? "?"})\n${body}`;
  });
  return clip(rendered.join("\n\n"), budgetChars);
}

/* ------------------------------------------------------------------ pass 1 */

export function analysisPrompt(args: {
  courseName: string;
  syllabus: string;
  coverage: Coverage;
  ownPapers: PastPaper[];
  borrowedPapers: { code: string; name: string; papers: PastPaper[] }[];
  topicFreq?: Record<string, number>;
}): string {
  const own = args.ownPapers.length ? renderPapers(args.ownPapers) : "";
  const borrowed = args.borrowedPapers
    .filter((b) => b.papers.length)
    .map((b) => `## Related course ${b.code} — ${b.name}\n${renderPapers(b.papers)}`)
    .join("\n\n");
  const freq = args.topicFreq
    ? Object.entries(args.topicFreq)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}: ${n}`)
        .join(", ")
    : "";

  return `You are cramBIT's exam-pattern analyst. Think carefully and thoroughly about how the
mid-sem for "${args.courseName}" is actually set, based on real evidence.

SYLLABUS (the only allowed scope):
${clip(args.syllabus, 4200)}

${
  own
    ? `THIS COURSE'S REAL PAST MID-SEM PAPERS — read every question:\n${own}`
    : `No past papers exist for this exact course; use the related-course papers below and map
their patterns onto this syllabus.`
}
${borrowed ? `\nRELATED-COURSE PAST PAPERS:\n${borrowed}` : ""}
${freq ? `\nPRE-COMPUTED topic frequency across sessions: ${freq}` : ""}

Analyse:
- Which syllabus modules are examined, how often, and at what marks.
- Questions that repeat near-verbatim across years (list them under "repeats").
- Recurring question phrasings/verbs per module.
- Which modules were NOT asked in the most recent session (i.e. "due").
- Which module pairs tend to appear together in one paper.

Return JSON only:
{
  "modules": [
    { "title": "<module>", "frequency": "very-high|high|medium|low",
      "typicalMarks": <number>, "questionStems": ["<recurring phrasings>"],
      "difficulty": "recall|apply|analyse", "lastAskedSession": "<session or empty>" }
  ],
  "coOccurring": [["<moduleA>","<moduleB>"]],
  "repeats": ["<near-verbatim recurring questions>"],
  "notes": "<2-3 sentences on the overall setting pattern>"
}
Cover EVERY syllabus module. Base everything on the evidence above, not generic guessing.`;
}

/* ------------------------------------------------------------------ pass 2 */

export function candidatePoolPrompt(args: {
  courseName: string;
  syllabus: string;
  blueprint: Blueprint;
  pastPapers: PastPaper[];
}): string {
  return `You are predicting the ACTUAL questions likely to appear on the next mid-sem of
"${args.courseName}". Reason step by step, then output the pool.

SYLLABUS:
${clip(args.syllabus, 4200)}

BLUEPRINT (from evidence analysis):
${JSON.stringify(args.blueprint)}

${args.pastPapers.length ? `PAST PAPERS:\n${renderPapers(args.pastPapers)}` : ""}

Build a pool of the most probable individual sub-questions. For each:
- Decide it is a 2-mark part (short/definitional) or a 3-mark part (derivation/algorithm/
  comparison/numerical).
- Assign a probability (0-1) that a question of this kind appears on the next paper, based on
  frequency, recency ("due" topics score higher), and near-verbatim repeats (score highest).
- Give a one-line rationale citing the pattern/years.

Produce at least 16 candidates spanning all high- and medium-frequency modules (more 3-mark
than 2-mark). Return JSON only:
{ "candidates": [ { "module": "<module>", "marks": 2|3, "text": "<exact question>",
                    "probability": <0-1>, "rationale": "<why>" } ] }
Every question must be strictly inside the syllabus.`;
}

/* ------------------------------------------------------------------ pass 3 */

export function assemblyPrompt(args: {
  courseCode: string;
  courseName: string;
  syllabus: string;
  candidates: Candidate[];
  setCount: number;
}): string {
  return `Assemble ${args.setCount} DISTINCT predicted mid-sem papers for
${args.courseCode} — ${args.courseName} from this candidate pool.

${EXAM_RULES}

SYLLABUS SCOPE:
${clip(args.syllabus, 3200)}

CANDIDATE POOL (module | marks | probability | question):
${args.candidates
  .slice(0, 26)
  .map((c) => `- ${c.module} | ${c.marks}m | ${c.probability.toFixed(2)} | ${c.text}`)
  .join("\n")}

RULES:
- Each paper: 5 questions, each = one 2-mark part (a) + one 3-mark part (b), total 25.
- Prefer the highest-probability candidates. Every paper must include the very-high /
  high-probability modules.
- Rotate the lower-probability candidates so the ${args.setCount} papers are genuinely
  different, not reworded copies.
- You may lightly rephrase a candidate for fit, but not change its topic or difficulty.
- If the pool lacks a needed part, write one that matches the blueprint and syllabus.

Each set is GitHub-flavoured Markdown, formatted EXACTLY:

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
... Q2–Q5 same shape ...

---

_${PAPER_FOOTER}_

Return JSON only: { "sets": ["<markdown 1>", "<markdown 2>", ...] }`;
}

/* ------------------------------------------------------------------ pass 4 */

export function validationPrompt(set: string, syllabus: string): string {
  return `Check this predicted mid-sem paper. Return JSON only:
{ "ok": <bool>, "problems": ["..."] }

Fail (ok:false) if ANY of: not exactly 5 questions; a question's parts are not (a)=2 and
(b)=3 marks; total is not 25; a sub-question needs knowledge outside the syllabus; two
sub-questions in the same paper are duplicates.

SYLLABUS:
${clip(syllabus, 3500)}

PAPER:
${set}`;
}
