import { ParticleField } from "./particle-field";

/**
 * Ambient background: a live constellation canvas over two slow colour glows.
 * Fixed, behind everything, non-interactive. Motion is disabled for
 * prefers-reduced-motion (canvas freezes; glows stop animating via globals.css).
 */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-blob b1" />
      <div className="backdrop-blob b2" />
      <ParticleField />
    </div>
  );
}
