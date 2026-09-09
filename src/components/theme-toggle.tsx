"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`grid h-9 w-9 place-items-center rounded-pill border border-border text-muted transition-colors hover:text-text ${className}`}
    >
      {mounted ? (
        <span className="text-body-sm">{isDark ? "☾" : "☀"}</span>
      ) : (
        <span className="text-body-sm opacity-0">☾</span>
      )}
    </button>
  );
}
