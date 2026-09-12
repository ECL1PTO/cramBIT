import type { Blueprint, Candidate, Coverage, PastPaper } from "./types";
import { PAPER_FOOTER } from "@/data/legal";

const EXAM_RULES = `
BIT Mesra MID-SEMESTER format — non-negotiable:
- Max Marks: exactly 25. Time: 1.5 hours.
- Exactly 5 questions. "Attempt all 5 questions. Each question carries 5 marks."
- Every question has two parts: (a) worth 2 marks, (b) worth 3 marks. 2 + 3 = 5.
- Every sub-question must be answerable purely from the syllabus given. Nothing out of syllabus.
- Questions must be concrete and examinable — a real question a professor would set.
`;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

function renderPapers(papers: PastPaper[], budgetChars = 3000): string {
  const list = papers.slice(0, 3);
  const per = Math.floor(budgetChars / Math.max(1, list.length));
  const rendered = list.map((p) => {
    const structured = p.questions
      .map(
        (q) =>
          `${q.number}. ` +
          q.parts.map((x) => `(${x.label}) [${x.marks ?? "?"}m] ${x.text}`).join("  "),
      )
      .join("\n");
    const body = structured || clip(p.rawText?.trim() ?? "", per);
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

  return `You are cramBIT's exam-pattern analyst, analysing how the mid-sem for
"${args.courseName}" is actually set, based on real evidence.

Output rules: reply with ONE JSON object and nothing else — no reasoning, no
explanation, no markdown code fences. Do your thinking silently.

SYLLABUS (the only allowed scope):
${clip(args.syllabus, 3400)}

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
- The FORMAT each module is actually examined in. Some subjects (Personality
  Development, Management, HR, and similar applied/soft-skill courses) set
  almost every question as a short realistic scenario or case ("A project is
  missing deadlines because of unclear ownership, how would you fix this at a
  team level?", "Do a SWOT analysis of X") rather than a direct/abstract prompt
  ("Define X", "List the types of Y"). Read the actual past questions closely —
  if they read like a mini case/scenario followed by an application ask, tag
  that module "case-study"; if they're direct/abstract, tag it "direct"; if the
  evidence shows a real mix, tag it "mixed". Do not default to "direct" just
  because a module could theoretically be asked either way — go by what the
  real papers actually show. For "case-study"/"mixed" modules, pull 1-2 short
  example scenarios from the evidence (paraphrase, don't copy verbatim) into
  "caseStudyExamples" so the next pass has a concrete style to match.

Cover EVERY syllabus module. Base everything on the evidence above, not generic
guessing. Reply with exactly this JSON object and nothing before or after it:
{
  "modules": [
    { "title": "<module>", "frequency": "very-high|high|medium|low",
      "typicalMarks": <number>, "questionStems": ["<recurring phrasings>"],
      "difficulty": "recall|apply|analyse",
      "questionFormat": "direct|case-study|mixed",
      "caseStudyExamples": ["<short paraphrased example scenario, if any>"],
      "lastAskedSession": "<session or empty>" }
  ],
  "coOccurring": [["<moduleA>","<moduleB>"]],
  "repeats": ["<near-verbatim recurring questions>"],
  "notes": "<2-3 sentences on the overall setting pattern>"
}`;
}

/* ------------------------------------------------------------------ pass 2 */

export function candidatePoolPrompt(args: {
  courseName: string;
  syllabus: string;
  blueprint: Blueprint;
  pastPapers: PastPaper[];
}): string {
  return `You are predicting the ACTUAL questions likely to appear on the next mid-sem of
"${args.courseName}".

Output rules: reply with ONE JSON object and nothing else — no reasoning, no
explanation, no markdown code fences. Do your thinking silently.

SYLLABUS:
${clip(args.syllabus, 2800)}

BLUEPRINT (from evidence analysis):
${JSON.stringify(args.blueprint)}

${args.pastPapers.length ? `PAST PAPERS (for near-verbatim repeats):\n${renderPapers(args.pastPapers, 2200)}` : ""}

Build a pool of the most probable individual sub-questions. For each:
- Decide it is a 2-mark part (short/definitional) or a 3-mark part (derivation/algorithm/
  comparison/numerical).
- Check the module's "questionFormat" in the blueprint. If it's "case-study" or "mixed",
  that question must read like the real papers do: a short realistic scenario (a
  workplace situation, a named-but-generic company, a decision someone has to make)
  followed by the actual ask, not a bare abstract prompt. Use "caseStudyExamples" as
  your style reference, but write a fresh scenario, never copy one verbatim. Modules
  tagged "direct" should stay direct — don't invent a scenario where the real papers
  don't use one.
- Assign a probability (0-1) that a question of this kind appears on the next paper, based on
  frequency, recency ("due" topics score higher), and near-verbatim repeats (score highest).
- Give a one-line rationale citing the pattern/years.

Produce at least 16 candidates spanning all high- and medium-frequency modules (more 3-mark
than 2-mark). For every module tagged "case-study" or "mixed", most of its candidates must
carry that scenario framing, not just one token example. Every question must be strictly
inside the syllabus. Reply with exactly this JSON object and nothing before or after it:
{ "candidates": [ { "module": "<module>", "marks": 2|3, "text": "<exact question>",
                    "probability": <0-1>, "rationale": "<why>" } ] }`;
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
${clip(args.syllabus, 2800)}

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
- You may lightly rephrase a candidate for fit, but not change its topic or difficulty, and
  not strip out a scenario/case-study framing if the candidate has one. A question written as
  a short scenario must stay a scenario; don't flatten it into an abstract one-liner.
- If the pool lacks a needed part, write one that matches the blueprint and syllabus.

OUTPUT: plain GitHub-flavoured Markdown, left-aligned. Do NOT use any HTML tags,
<div>, align attributes, blockquotes, or code fences. Separate the ${args.setCount}
papers with a line containing exactly ===SET_SPLIT=== and nothing else.

Format EACH paper EXACTLY like this (headings with #, everything else plain text):

# BIRLA INSTITUTE OF TECHNOLOGY, MESRA
## MID-SEMESTER EXAMINATION (PREDICTED)

**Course:** ${args.courseCode} — ${args.courseName}
**Time:** 1.5 Hours  |  **Max Marks:** 25

---

**Attempt all 5 questions. Each question carries 5 marks.**

**Q1.**
**(a)** <question> _(2 Marks)_
**(b)** <question> _(3 Marks)_

**Q2.**
**(a)** <question> _(2 Marks)_
**(b)** <question> _(3 Marks)_

(Q3, Q4, Q5 the same — always exactly 5 questions, each with a 2-mark (a) and a 3-mark (b).)

---

_${PAPER_FOOTER}_`;
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
