import Link from "next/link";
import { clsx } from "clsx";

/**
 * cramBIT mark — a radar sweep. "Predicting what's coming." The sweep line
 * rotates; a blip sits where a question was found. Not a rounded-square star.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cb-sweep" x1="16" y1="16" x2="30" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="var(--color-surface-2)" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="var(--color-border)" strokeWidth="1" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--color-border)" strokeWidth="1" />
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="var(--color-border)" strokeWidth="1" />
      <g style={{ transformOrigin: "16px 16px", animation: "spin-slow 3.5s linear infinite" }}>
        <path d="M16 16 L31 16 A15 15 0 0 0 26.6 5.4 Z" fill="url(#cb-sweep)" />
        <line x1="16" y1="16" x2="31" y2="16" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="16" cy="16" r="2" fill="var(--color-accent)" />
      <circle cx="22.5" cy="10.5" r="1.7" fill="var(--color-accent-2)">
        <animate attributeName="opacity" values="1;0.15;1" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function Wordmark({
  className,
  size = "md",
  href = "/",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const text = { sm: "text-body", md: "text-lead", lg: "text-h3" }[size];
  const mark = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" }[size];

  return (
    <Link href={href} className={clsx("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className={clsx(mark, "transition-transform duration-300 group-hover:scale-110")} />
      <span className={clsx("font-mono font-medium tracking-tight text-text", text)}>
        cram<span className="text-accent">BIT</span>
      </span>
    </Link>
  );
}
