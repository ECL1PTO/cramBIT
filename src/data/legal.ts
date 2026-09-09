/**
 * Single source of truth for cramBIT's disclaimers. Rendered on the landing page,
 * the paywall/checkout, every generated paper, and the /terms + /privacy pages.
 */

export const DISCLAIMER_SHORT =
  "Predictions only. No guarantee any question appears. cramBIT is not affiliated with BIT Mesra.";

export const NOT_AFFILIATED =
  "cramBIT is an independent student tool. Not affiliated with, endorsed by, or connected to Birla Institute of Technology, Mesra.";

export const PAPER_FOOTER =
  "Predicted paper — AI-generated estimate from past papers and syllabus. No accuracy guarantee. cramBIT accepts no liability for exam outcomes.";

export const DISCLAIMER_ACK =
  "I understand these are predictions with no guarantee of accuracy, that questions I study may not appear, and that cramBIT is not responsible for my exam result.";

export const PAYMENT_NOTE =
  "Payment unlocks access to the prediction tool. It is not payment for results. No refunds are given on the basis of prediction accuracy.";

export const TERMS_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What cramBIT is",
    body: "cramBIT generates predicted mid-semester question papers by analysing publicly available past papers and the syllabus you provide. Output is a statistical and AI-based estimate of what is likely, not confidential information and not a copy of any real upcoming paper.",
  },
  {
    heading: "No warranty",
    body: "The service is provided “as is”. We make no warranty that predicted questions will appear on your actual exam, in whole or in part, or that generated content is free of errors.",
  },
  {
    heading: "No liability",
    body: "To the maximum extent permitted by law, cramBIT and its operator are not liable for any academic outcome, loss, or damage arising from use of the service, including questions you studied that did not appear or errors in generated answers.",
  },
  {
    heading: "Payments and refunds",
    body: "Paid plans unlock access to the tool for the stated scope. Because the value is the prediction tool itself and not a guaranteed result, payments are non-refundable on the basis of prediction accuracy. Genuine duplicate or failed transactions will be resolved.",
  },
  {
    heading: "Acceptable use",
    body: "One account per person, restricted to @bitmesra.ac.in students. Do not resell access, automate the service, or attempt to bypass free-tier limits. Accounts doing so may be suspended without refund.",
  },
  {
    heading: "Trademark",
    body: NOT_AFFILIATED,
  },
];

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What we store",
    body: "Your college email, the course codes and syllabus text you submit, the papers generated for you, and payment claim references. That's it.",
  },
  {
    heading: "How we use it",
    body: "To run the prediction engine, show you your past papers, and process access. Syllabus text you paste is sent to Google's Gemini API to generate papers. We do not sell data or run advertising.",
  },
  {
    heading: "Deletion",
    body: "Email the operator to have your account and associated data deleted.",
  },
];
