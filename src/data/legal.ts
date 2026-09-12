/**
 * Single source of truth for cramBIT's disclaimers. Rendered on the landing page,
 * the paywall/checkout, every generated paper, and the /terms + /privacy pages.
 */

export const DISCLAIMER_SHORT =
  "Predictions only. No guarantee any question appears. cramBIT is not affiliated with BIT Mesra.";

export const NOT_AFFILIATED =
  "cramBIT is an independent student tool. Not affiliated with, endorsed by, or connected to Birla Institute of Technology, Mesra.";

export const PAPER_FOOTER =
  "Predicted paper. An AI-generated estimate from past papers and syllabus, not a guarantee. cramBIT accepts no liability for exam outcomes.";

export const DISCLAIMER_ACK =
  "I understand these are predictions with no guarantee of accuracy, that questions I study may not appear, and that cramBIT is not responsible for my exam result.";

export const PAYMENT_NOTE =
  "cramBIT is free for everyone. This is a fully optional contribution, not a payment for results or access. Nothing is unlocked by it and nothing is owed back.";

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
    heading: "Support contributions",
    body: "cramBIT is free for everyone, nothing is gated behind payment. Any contribution made through the optional \"support\" option is voluntary, unlocks nothing, and is not a purchase of results. It simply helps keep the service running.",
  },
  {
    heading: "Acceptable use",
    body: "One account per person, restricted to @bitmesra.ac.in students. Do not resell access, automate the service, or attempt to bypass the fair-use generation caps. Accounts doing so may be suspended.",
  },
  {
    heading: "Trademark",
    body: NOT_AFFILIATED,
  },
];

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What we store",
    body: "Your college email, the course codes and syllabus text you submit, the papers generated for you, and (only if you choose to support the project) a record of that contribution. That's it.",
  },
  {
    heading: "How we use it",
    body: "To run the prediction engine and show you your past papers. Syllabus text you paste and the relevant past-paper text are sent to third-party AI providers (routed through our infrastructure, which may include Google Gemini, Groq, and other model providers) to generate papers. We do not sell data or run advertising.",
  },
  {
    heading: "Deletion",
    body: "Email crambit.study@gmail.com to have your account and associated data deleted.",
  },
];
