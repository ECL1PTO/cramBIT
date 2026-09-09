"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div>
        <h1 className="text-h3 font-normal text-text">Something broke.</h1>
        <p className="mt-2 text-body-sm text-muted">
          That’s on us. Try again — your progress isn’t lost.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-pill bg-accent px-5 py-2.5 text-body-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
