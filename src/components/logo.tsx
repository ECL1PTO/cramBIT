import Link from "next/link";
import { clsx } from "clsx";

/**
 * cramBIT mark — a four-point spark (prediction / insight), echoing the
 * constellation background. Deliberately not a terminal prompt.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="0" y="0" width="24" height="24" rx="6.5" fill="var(--color-accent)" />
      <path
        d="M12 4.2l1.45 4.35a2 2 0 0 0 1.26 1.26L19.8 11l-4.35 1.45a2 2 0 0 0-1.26 1.26L12.9 18a1 1 0 0 1-1.8 0l-1.29-3.84a2 2 0 0 0-1.26-1.26L4.2 11.6a1 1 0 0 1 0-1.9l3.84-1.29a2 2 0 0 0 1.26-1.26L12 4.2z"
        fill="#fff"
      />
      <circle cx="18.5" cy="18.5" r="1.5" fill="#fff" opacity="0.85" />
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
        className={clsx(mark, "transition-transform duration-500 group-hover:rotate-[90deg]")}
      />
      <span className={clsx("font-mono font-medium tracking-tight text-text", text)}>
        cram<span className="text-accent">BIT</span>
      </span>
    </Link>
  );
}
