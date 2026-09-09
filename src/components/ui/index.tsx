import { clsx } from "clsx";
import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ layout */

export function Container({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("mx-auto w-full max-w-[1120px] px-5 sm:px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("max-w-2xl", className)}>
      {eyebrow ? (
        <p className="mb-3 font-mono text-caption uppercase tracking-[0.14em] text-faint">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-h2 font-normal leading-tight tracking-tight text-text">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-lead leading-relaxed text-muted">{lead}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "ghost" | "quiet";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 text-body-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost: "border border-text/25 text-text hover:border-text/60",
  quiet: "text-muted hover:text-text",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={clsx(buttonBase, buttonVariants[variant], className)} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ surfaces */

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-card bg-surface p-6 sm:p-8", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-pill border border-border px-3 py-1 text-caption text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MonoChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-sheet border border-border bg-surface-2 px-2 py-0.5 font-mono text-caption text-text",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ inputs */

const fieldBase =
  "w-full rounded-input border border-border bg-surface-2 px-4 py-3 text-body text-text placeholder:text-faint transition-colors duration-200 focus:border-accent focus:outline-none";

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-2 block text-body-sm text-muted">{label}</span>
      <input className={fieldBase} {...props} />
      {error ? (
        <span className="mt-1.5 block text-caption text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-caption text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-2 block text-body-sm text-muted">{label}</span>
      <textarea className={clsx(fieldBase, "min-h-40 resize-y font-mono text-body-sm")} {...props} />
      {hint ? <span className="mt-1.5 block text-caption text-faint">{hint}</span> : null}
    </label>
  );
}
