/** Short, Gen-Z, low-cringe motivational lines shown at various moments. */

export const HYPE = {
  login: [
    "Mid-sems don't stand a chance.",
    "One login away from walking in prepared.",
    "Your syllabus, but make it strategic.",
  ],
  generating: [
    "Cooking up your paper. Don't blink.",
    "Reading years of past papers so you don't have to.",
    "Finding the questions the profs keep recycling.",
    "This is the part where you stop panicking.",
  ],
  done: [
    "Paper's ready. Now go be that student.",
    "Predicted, printed, sorted. Go cram.",
    "Study smart today, flex the grade later.",
    "You've got the map. Walk the exam.",
  ],
  empty: [
    "Pick a subject. Let's get you ahead.",
    "Every topper started with a plan. Here's yours.",
  ],
} as const;

/** Deterministic pick so server and client render the same thing. */
export function pickHype(key: keyof typeof HYPE, seed = 0): string {
  const list = HYPE[key];
  return list[seed % list.length];
}
