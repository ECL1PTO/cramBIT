/**
 * The hero centrepiece — a floating, tilted preview of a real predicted paper
 * with two orbiting status chips. Pure CSS motion; demonstrative, not decorative.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none [perspective:1400px]">
      {/* glow */}
      <div className="glow-accent absolute inset-0" />

      {/* paper card */}
      <div
        className="rise rise-3 relative rounded-card border border-border bg-surface p-6 shadow-[0_30px_80px_-20px_rgba(80,70,229,0.35)] [transform:rotateX(6deg)_rotateY(-9deg)]"
        style={{ animation: "float-slow 7s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger/70" />
          <span className="h-2 w-2 rounded-full bg-hi/80" />
          <span className="h-2 w-2 rounded-full bg-accent-2/70" />
          <span className="ml-auto font-mono text-caption text-faint">CA25121 · SET A</span>
        </div>

        <div className="mt-5 space-y-3 font-paper text-[0.9rem] leading-relaxed text-text">
          <p className="text-center font-semibold">MID-SEMESTER EXAMINATION (PREDICTED)</p>
          <div className="h-px bg-border" />
          <p>
            <span className="font-semibold">Q1. (a)</span> Define time–space trade-off with an
            example. <span className="text-faint">(2)</span>
          </p>
          <p>
            <span className="font-semibold">(b)</span> Write an algorithm to insert a node at
            the k-th position of a singly linked list. <span className="text-faint">(3)</span>
          </p>
          <p className="text-faint">
            <span className="font-semibold text-text">Q2. (a)</span> State the worst-case
            complexity of stack push using an array…
          </p>
        </div>
      </div>

      {/* orbiting chips */}
      <div
        className="rise rise-4 absolute -left-6 top-10 rounded-pill border border-border bg-surface px-3 py-1.5 font-mono text-caption text-muted shadow-lg"
        style={{ animation: "float-slow 6s ease-in-out infinite reverse" }}
      >
        blueprint ✓
      </div>
      <div
        className="rise rise-4 absolute -right-4 bottom-8 rounded-pill border border-accent bg-accent-soft px-3 py-1.5 font-mono text-caption text-text shadow-lg"
        style={{ animation: "float-slow 8s ease-in-out infinite" }}
      >
        3 sets ready
      </div>
    </div>
  );
}
