import Link from "next/link";
import { clsx } from "clsx";

/**
 * cramBIT's brand is the wordmark: monospace, with a live blinking cursor.
 * No decorative glyph — the terminal cursor is the mark.
 */
export function Wordmark({
  className,
  size = "md",
  href = "/",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const text = { sm: "text-body", md: "text-lead", lg: "text-h2" }[size];

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-baseline font-mono font-semibold tracking-tight text-text",
        text,
        className,
      )}
    >
      cram<span className="text-accent">BIT</span>
      <span className="cursor-blink ml-[1px] text-accent">_</span>
    </Link>
  );
}

/** Compact mark for tight spots (currently unused in the UI). */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--color-accent)" />
      <rect x="9" y="20" width="14" height="3.4" rx="1.7" fill="#fff">
        <animate attributeName="opacity" values="1;1;0;0;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
      <text
        x="16"
        y="17"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize="13"
        fontWeight="700"
        fill="#fff"
      >
        cB
      </text>
    </svg>
  );
}
