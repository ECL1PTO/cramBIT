import { ParticleField } from "./particle-field";

/**
 * Ambient background — a live, cursor-reactive dot-grid over a slowly rotating
 * colour wash, painted on a fixed full-viewport canvas. Frozen for
 * prefers-reduced-motion.
 */
export function Backdrop() {
  return <ParticleField />;
}
