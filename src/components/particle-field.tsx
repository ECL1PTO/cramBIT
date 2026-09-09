"use client";

import { useEffect, useRef } from "react";

/**
 * Live background: a breathing dot-grid that ripples on its own and lights up
 * around the cursor, over a slowly rotating colour wash painted on the canvas
 * itself (so light mode is never "just white"). DPR-aware, pauses on hidden
 * tab, freezes for prefers-reduced-motion.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = (v: string, fb: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const GAP = 46;
    let cols = 0;
    let rows = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
    }

    const mouse = { x: w / 2, y: -300 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.y = -300;
    };

    let raf = 0;
    let t = 0;

    function draw() {
      t += reduce ? 0 : 0.012;

      const accent = css("--c-accent", "#6674f6");
      const accent2 = css("--c-accent-2", "#e152ff");
      const isDark = document.documentElement.classList.contains("dark")
        ? true
        : document.documentElement.classList.contains("light")
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

      ctx.clearRect(0, 0, w, h);

      // rotating colour wash
      const cx = w * (0.5 + 0.28 * Math.cos(t * 0.35));
      const cy = h * (0.32 + 0.22 * Math.sin(t * 0.28));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
      g.addColorStop(0, hexA(accent, isDark ? 0.22 : 0.14));
      g.addColorStop(0.45, hexA(accent2, isDark ? 0.1 : 0.07));
      g.addColorStop(1, hexA(accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // dot grid
      const near: { x: number; y: number }[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x0 = i * GAP;
          const y0 = j * GAP;
          const wave = Math.sin(x0 * 0.02 + y0 * 0.02 - t * 2) * 2.4;
          const x = x0 + wave;
          const y = y0 + wave;

          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.hypot(dx, dy);
          const glow = Math.max(0, 1 - dist / 170);

          const r = 1 + glow * 2.6;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = hexA(
            glow > 0.05 ? accent : isDark ? "#ffffff" : "#111111",
            (isDark ? 0.16 : 0.13) + glow * 0.75,
          );
          ctx.fill();

          if (glow > 0.25) near.push({ x, y });
        }
      }

      // link the dots near the cursor
      for (let a = 0; a < near.length; a++) {
        for (let b = a + 1; b < near.length; b++) {
          const d = Math.hypot(near[a].x - near[b].x, near[a].y - near[b].y);
          if (d < GAP * 1.7) {
            ctx.beginPath();
            ctx.moveTo(near[a].x, near[a].y);
            ctx.lineTo(near[b].x, near[b].y);
            ctx.strokeStyle = hexA(accent, 0.35 * (1 - d / (GAP * 1.7)));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw);
    }

    function hexA(hex: string, a: number) {
      const c = hex.replace("#", "");
      const n =
        c.length === 3
          ? c
              .split("")
              .map((ch) => ch + ch)
              .join("")
          : c.padEnd(6, "0").slice(0, 6);
      const r = parseInt(n.slice(0, 2), 16);
      const gg = parseInt(n.slice(2, 4), 16);
      const bb = parseInt(n.slice(4, 6), 16);
      return `rgba(${r},${gg},${bb},${a})`;
    }

    resize();
    draw();

    const onVis = () => {
      if (!document.hidden && !reduce) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 h-full w-full"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
