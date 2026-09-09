import Link from "next/link";
import { clsx } from "clsx";

/**
 * cramBIT mark — a live probability readout. Four bars (question likelihood),
 * the second-tallest lit: "here's the one that's coming up". The bars pulse.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  const bars = [
    { x: 5, base: 14, peak: 9 },
    { x: 11, base: 6, peak: 4, lit: true },
    { x: 17, base: 18, peak: 12 },
    { x: 23, base: 11, peak: 20 },
  ];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="var(--color-accent)" />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          width="4"
          rx="1.5"
          fill={b.lit ? "var(--color-accent-2)" : "#fff"}
          opacity={b.lit ? 1 : 0.9}
          y={b.base}
          height={28 - b.base}
        >
          <animate
            attributeName="y"
            values={`${b.base};${b.peak};${b.base}`}
            dur="2.6s"
            begin={`${i * 0.18}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            values={`${28 - b.base};${28 - b.peak};${28 - b.base}`}
            dur="2.6s"
            begin={`${i * 0.18}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
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
    <Link
      href={href}
      className={clsx("group inline-flex items-center gap-2.5", className)}
    >
      {mark && (
        <LogoMark
          className={clsx(glyph, "transition-transform duration-300 group-hover:scale-110")}
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
