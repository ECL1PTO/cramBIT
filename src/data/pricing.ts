/**
 * Pricing is defined here and recomputed server-side on every payment claim
 * / Razorpay order. The client never sets the amount.
 */
export const PRICING = {
  perSubject: 49, // rupees
  bundle: 199, // rupees — up to BUNDLE_SUBJECT_CAP subjects this mid-sem season
} as const;

/** Marketing says "up to 5 subjects" — enforced in entitlement.ts. */
export const BUNDLE_SUBJECT_CAP = 5;

export type Plan = "subject" | "bundle";

export function amountForPlan(plan: Plan): number {
  return plan === "bundle" ? PRICING.bundle : PRICING.perSubject;
}
