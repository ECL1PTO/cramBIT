"use client";

import { useEffect, useRef } from "react";

/**
 * Live background canvas:
 *  - a slowly rotating radial colour wash (never a blank white page)
 *  - a breathing dot-grid that ripples on its own and lights + links near the cursor
 *  - drifting "comets" with short trails
 *  - an expanding ring on click
 * DPR-aware, pauses on hidden tab, freezes for prefers-reduced-motion.
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
    const cssVar = (v: string, fb: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const GAP = 42;
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

    const mouse = { x: w / 2, y: -400 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.y = -400;
    };

    type Comet = { x: number; y: number; vx: number; vy: number };
    let comets: Comet[] = [];
    function seedComets() {
      const n = Math.round(Math.min(18, (w * h) / 90000));
      comets = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0.4 + Math.random() * 0.9,
        vy: 0.15 + Math.random() * 0.4,
      }));
    }

    type Ring = { x: number; y: number; r: number };
    const rings: Ring[] = [];
    const onDown = (e: MouseEvent) => rings.push({ x: e.clientX, y: e.clientY, r: 0 });

    function hexA(hex: string, a: number) {
      const c = hex.replace("#", "");
      const n =
        c.length === 3
          ? c.split("").map((ch) => ch + ch).join("")
          : c.padEnd(6, "0").slice(0, 6);
      return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(
        n.slice(4, 6),
        16,
      )},${a})`;
    }

    let raf = 0;
    let t = 0;

    function draw() {
      t += reduce ? 0 : 0.014;

      const accent = cssVar("--c-accent", "#6674f6");
      const accent2 = cssVar("--c-accent-2", "#e152ff");
      const dark = document.documentElement.classList.contains("dark")
        ? true
        : document.documentElement.classList.contains("light")
          ? false
          : window.matchMedia("(prefers-color-scheme: dark)").matches;

      ctx.clearRect(0, 0, w, h);

      // rotating colour wash
      const gx = w * (0.5 + 0.3 * Math.cos(t * 0.4));
      const gy = h * (0.35 + 0.25 * Math.sin(t * 0.33));
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h));
      grad.addColorStop(0, hexA(accent, dark ? 0.28 : 0.16));
      grad.addColorStop(0.5, hexA(accent2, dark ? 0.12 : 0.08));
      grad.addColorStop(1, hexA(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const dotBase = dark ? "#c8ccf5" : "#3a3a55";

      // dot grid
      const near: { x: number; y: number }[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const bx = i * GAP;
          const by = j * GAP;
          const wave = Math.sin(bx * 0.018 + by * 0.02 - t * 2.2) * 3;
          const x = bx + wave;
          const y = by + wave;

          const dist = Math.hypot(mouse.x - x, mouse.y - y);
          const glow = Math.max(0, 1 - dist / 190);

          ctx.beginPath();
          ctx.arc(x, y, 1.1 + glow * 3, 0, Math.PI * 2);
          ctx.fillStyle = hexA(glow > 0.06 ? accent : dotBase, (dark ? 0.22 : 0.2) + glow * 0.7);
          ctx.fill();
          if (glow > 0.25) near.push({ x, y });
        }
      }
      for (let a = 0; a < near.length; a++) {
        for (let b = a + 1; b < near.length; b++) {
          const d = Math.hypot(near[a].x - near[b].x, near[a].y - near[b].y);
          if (d < GAP * 1.8) {
            ctx.beginPath();
            ctx.moveTo(near[a].x, near[a].y);
            ctx.lineTo(near[b].x, near[b].y);
            ctx.strokeStyle = hexA(accent, 0.4 * (1 - d / (GAP * 1.8)));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // comets
      for (const c of comets) {
        if (!reduce) {
          c.x += c.vx;
          c.y += c.vy;
          if (c.x > w + 40) {
            c.x = -40;
            c.y = Math.random() * h;
          }
          if (c.y > h + 40) c.y = -40;
        }
        const grd = ctx.createLinearGradient(c.x - c.vx * 26, c.y - c.vy * 26, c.x, c.y);
        grd.addColorStop(0, hexA(accent, 0));
        grd.addColorStop(1, hexA(accent2, dark ? 0.8 : 0.55));
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(c.x - c.vx * 26, c.y - c.vy * 26);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(c.x, c.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = hexA("#ffffff", dark ? 0.9 : 0.7);
        ctx.fill();
      }

      // click rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i];
        rg.r += 6;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(accent, Math.max(0, 0.5 - rg.r / 320));
        ctx.lineWidth = 2;
        ctx.stroke();
        if (rg.r > 320) rings.splice(i, 1);
      }

      if (!document.hidden && (!reduce || rings.length)) raf = requestAnimationFrame(draw);
    }

    resize();
    seedComets();
    draw();

    const onResize = () => {
      resize();
      seedComets();
    };
    const onVis = () => {
      if (!document.hidden) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mousedown", onDown);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
