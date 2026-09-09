import type { Metadata } from "next";
import { Container, Card } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { SupportForm } from "@/components/support-form";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <main className="min-h-screen">
      <Container className="py-6">
        <Wordmark size="md" />
      </Container>
      <Container className="max-w-lg py-12 sm:py-section">
        <h1 className="text-h1 font-normal tracking-tight text-text">
          Run into something?
        </h1>
        <p className="mt-3 text-lead leading-relaxed text-muted">
          Prediction way off, site broken, payment stuck — tell us. You&apos;ll get an
          instant confirmation and a real reply soon after.
        </p>
        <Card className="mt-8 border border-border">
          <SupportForm />
        </Card>
      </Container>
    </main>
  );
}
