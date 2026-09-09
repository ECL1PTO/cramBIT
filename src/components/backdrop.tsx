/**
 * Ambient animated background — three slow-drifting colour glows plus a few
 * floating tick marks. Fixed, behind everything, non-interactive, and frozen
 * for `prefers-reduced-motion` (handled globally in globals.css).
 */
const PARTICLES = [
  { left: "12%", top: "70%", delay: "0s", dur: "14s", glyph: "+" },
  { left: "28%", top: "40%", delay: "3s", dur: "18s", glyph: "×" },
  { left: "47%", top: "82%", delay: "6s", dur: "16s", glyph: "·" },
  { left: "63%", top: "30%", delay: "1.5s", dur: "20s", glyph: "+" },
  { left: "78%", top: "62%", delay: "4.5s", dur: "15s", glyph: "×" },
  { left: "88%", top: "22%", delay: "8s", dur: "19s", glyph: "·" },
  { left: "38%", top: "18%", delay: "2s", dur: "17s", glyph: "·" },
];

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-blob b1" />
      <div className="backdrop-blob b2" />
      <div className="backdrop-blob b3" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="backdrop-particle font-mono text-body"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
