import Link from "next/link";
import { clsx } from "clsx";

/** cramBIT mark — a caret + cursor: "what comes next". */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="var(--color-accent)" />
      <path
        d="M12 10.5 L17.5 16 L12 21.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="17.5"
        y1="21.5"
        x2="23"
        y2="21.5"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <animate attributeName="opacity" values="1;1;0;0;1" dur="1.3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

export function Wordmark({
  className,
  size = "md",
  href = "/",
  mark = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
  mark?: boolean;
}) {
  const text = { sm: "text-body", md: "text-lead", lg: "text-h2" }[size];
  const glyph = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" }[size];

  return (
    <Link href={href} className={clsx("group inline-flex items-center gap-2.5", className)}>
      {mark && (
        <LogoMark
          className={clsx(glyph, "transition-transform duration-300 group-hover:-rotate-6")}
        />
      )}
      <span
        className={clsx(
          "inline-flex items-baseline font-mono font-semibold tracking-tight text-text",
          text,
        )}
      >
        cram<span className="text-accent">BIT</span>
        <span className="cursor-blink ml-[1px] text-accent">_</span>
      </span>
    </Link>
  );
}
