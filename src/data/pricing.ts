/**
 * Pricing is defined here and recomputed server-side on every payment claim.
 * The client never sets the amount.
 *
 * PER_SUBJECT is a placeholder — set the real value before launch.
 */
export const PRICING = {
  perSubject: 49, // rupees — PLACEHOLDER
  bundle: 199, // rupees — every subject this mid-sem season
} as const;

export type Plan = "subject" | "bundle";

export function amountForPlan(plan: Plan): number {
  return plan === "bundle" ? PRICING.bundle : PRICING.perSubject;
}
