import Link from "next/link";
import { clsx } from "clsx";

/**
 * cramBIT mark — two chevrons squeezing a dot: "cram it down to what matters".
 * The chevrons breathe inward. Not a star, not a terminal prompt.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--color-accent)" />
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 9 L12.5 16 L7 23">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 1.6 0; 0 0"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M25 9 L19.5 16 L25 23">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; -1.6 0; 0 0"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <circle cx="16" cy="16" r="2.1" fill="#fff" />
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
      <LogoMark
        className={clsx(mark, "transition-transform duration-300 group-hover:scale-105")}
      />
      <span className={clsx("font-mono font-medium tracking-tight text-text", text)}>
        cram<span className="text-accent">BIT</span>
        <span className="cursor-blink text-accent">_</span>
      </span>
    </Link>
  );
}
