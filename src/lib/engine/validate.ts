/**
 * Structural validation of a generated paper — done in code, not with an LLM
 * call, so it's free, instant, and deterministic.
 */
export function validatePaper(md: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];

  const qs = md.match(/\*\*Q\s*([1-5])\.?\*\*/gi) ?? [];
  const uniqueQ = new Set(qs.map((q) => q.replace(/\D/g, "")));
  if (uniqueQ.size !== 5) problems.push(`found ${uniqueQ.size} questions, expected 5`);

  const twoMark = (md.match(/\(?\s*2\s*marks?\s*\)?/gi) ?? []).length;
  const threeMark = (md.match(/\(?\s*3\s*marks?\s*\)?/gi) ?? []).length;
  if (twoMark < 5) problems.push(`only ${twoMark} two-mark parts`);
  if (threeMark < 5) problems.push(`only ${threeMark} three-mark parts`);

  const parts = md.match(/\*\*\(?[ab]\)?\*\*/gi) ?? [];
  if (parts.length < 10) problems.push(`found ${parts.length} sub-parts, expected 10`);

  if (!/max\s*marks?\s*[:|]?\s*25/i.test(md)) problems.push("no 'Max Marks: 25' header");

  return { ok: problems.length === 0, problems };
}
