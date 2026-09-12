"use client";

import { CountUp } from "@/components/count-up";

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const FORMATS = {
  compact,
  plain: (n: number) => n.toLocaleString(),
} as const;

export function Stat({
  n,
  kind,
  label,
}: {
  n: number;
  kind: keyof typeof FORMATS;
  label: string;
}) {
  return (
    <div>
      <p className="font-serif text-h1 leading-none text-text">
        <CountUp value={n} format={FORMATS[kind]} />
      </p>
      <p className="mt-2 text-body-sm text-muted">{label}</p>
    </div>
  );
}
