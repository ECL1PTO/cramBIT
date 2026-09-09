import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div>
        <h1 className="font-mono text-h3 text-text">404</h1>
        <p className="mt-2 text-body-sm text-muted">Nothing here.</p>
        <Link href="/" className="mt-6 inline-block text-body-sm text-accent hover:underline">
          Go home
        </Link>
      </div>
    </main>
  );
}
