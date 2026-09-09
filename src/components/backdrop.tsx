import { ParticleField } from "./particle-field";

/**
 * Ambient background, two layers:
 *  1. .aurora — a CSS animated colour field (always renders).
 *  2. ParticleField — a canvas dot-grid that ripples and reacts to the cursor.
 * Both sit behind page content and freeze for prefers-reduced-motion.
 */
export function Backdrop() {
  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <ParticleField />
    </>
  );
}
