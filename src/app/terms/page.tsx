import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { TERMS_SECTIONS } from "@/data/legal";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Container className="py-section">
        <Link href="/" className="font-mono text-body-sm text-muted hover:text-text">
          ← cramBIT
        </Link>
        <h1 className="mt-8 text-h1 font-normal tracking-tight text-text">Terms of use</h1>
        <div className="mt-10 max-w-2xl space-y-8">
          {TERMS_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-h3 font-normal text-text">{s.heading}</h2>
              <p className="mt-2 text-body leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
