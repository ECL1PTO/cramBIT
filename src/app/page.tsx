import Link from "next/link";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  MonoChip,
  SectionHeading,
} from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRICING } from "@/data/pricing";
import { DISCLAIMER_SHORT, NOT_AFFILIATED } from "@/data/legal";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* nav */}
      <Container className="flex items-center justify-between py-5 sm:py-6">
        <Wordmark size="md" />
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" className="px-4 py-2">
            Log in
          </ButtonLink>
        </div>
      </Container>

      {/* hero */}
      <Container className="relative pt-12 pb-16 sm:pt-20 sm:pb-section">
        <div className="glow-accent max-w-3xl">
          <Badge className="rise rise-1">BIT Mesra · Noida campus</Badge>
          <h1 className="rise rise-2 mt-6 text-[2.4rem] font-normal leading-[1.06] tracking-tight text-text sm:text-h1 md:text-[3.5rem] lg:text-display">
            Walk into your mid-sem
            <br className="hidden sm:block" /> having already{" "}
            <span className="shimmer font-serif italic">seen the paper.</span>
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-body leading-relaxed text-muted sm:text-lead">
            cramBIT reads the real past mid-sem papers for your course, cross-references your
            syllabus, and writes the 25-mark question papers most likely to come up — three
            full sets, per subject.
          </p>
          <div className="rise rise-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/login" className="justify-center px-6 py-3 text-body">
              Predict my first paper — free
            </ButtonLink>
            <Link
              href="#how"
              className="px-4 py-2 text-center text-body-sm text-muted transition-colors hover:text-text"
            >
              How it works ↓
            </Link>
          </div>
          <p className="rise rise-4 mt-5 text-caption text-faint">{DISCLAIMER_SHORT}</p>
        </div>
      </Container>

      {/* how it works */}
      <Container id="how" className="scroll-mt-8 py-16 sm:py-section">
        <SectionHeading
          eyebrow="How it works"
          title="Past papers do the talking."
          lead="Not a generic AI guess. Every predicted question is anchored to what your course has actually asked before and what your syllabus actually covers."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Step n="01" title="Pick your subject">
            Type the course code. cramBIT loads every past mid-sem paper on record for it.
          </Step>
          <Step n="02" title="Paste the syllabus">
            Your section&apos;s syllabus becomes the hard boundary — nothing outside it is asked.
          </Step>
          <Step n="03" title="Get the papers">
            A frequency blueprint of topics and question styles, then three distinct 25-mark
            papers. Download as PDF, or ask the tutor to solve any question.
          </Step>
        </div>
      </Container>

      {/* new course */}
      <Container className="py-16 sm:py-section">
        <Card className="lift border border-border">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <MonoChip className="self-start">new course?</MonoChip>
            <p className="text-body leading-relaxed text-muted">
              If your subject is brand new and has no past papers on record, cramBIT still
              works — it predicts your paper from{" "}
              <span className="text-text">your syllabus</span> plus the past papers of
              subjects with a <span className="text-text">similar syllabus</span>, then flags
              it clearly so you know it&apos;s a softer prediction.
            </p>
          </div>
        </Card>
      </Container>

      {/* honesty */}
      <Container className="py-16 sm:py-section">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
          <SectionHeading
            eyebrow="How accurate is this?"
            title="It's a prediction, not a leak."
            lead="cramBIT estimates what is probable from history and syllabus weightage. Some predicted questions land close to the real paper; some don't. There is no guarantee any specific question appears, and cramBIT takes no responsibility for your result — use it to focus your revision, not to replace it."
          />
          <Card className="lift font-mono text-body-sm text-muted">
            <p className="text-faint">{"// sample — real generated output"}</p>
            <p className="mt-3 text-text">
              Q1. (a) Define time–space trade-off with an example.{" "}
              <span className="text-faint">(2)</span>
            </p>
            <p className="mt-2 text-text">
              (b) Write an algorithm to insert a node at the k-th position of a singly linked
              list and state its complexity. <span className="text-faint">(3)</span>
            </p>
            <p className="mt-4 text-faint">
              {"// this topic appeared in 3 of 4 past sessions"}
            </p>
          </Card>
        </div>
      </Container>

      {/* pricing */}
      <Container className="py-16 sm:py-section">
        <SectionHeading
          eyebrow="Pricing"
          title="First subject free. Try it against a real exam."
          lead="Generate your first subject for free, sit the exam, and see for yourself how close it lands. If it's worth it, come back and unlock the rest."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <PriceCard
            name="First subject"
            price="Free"
            note="One full prediction, any course. No card."
          />
          <PriceCard
            name="Per subject"
            price={`₹${PRICING.perSubject}`}
            note="Unlock any one more subject — all its predicted papers and the AI tutor."
          />
          <PriceCard
            name="Season bundle"
            price={`₹${PRICING.bundle}`}
            note="Up to 5 subjects for the whole mid-sem season. The obvious pick if you have 4+."
            highlight
          />
        </div>
        <p className="mt-4 text-caption text-faint">
          Payment unlocks the tool, not a result. No refunds on prediction accuracy.
        </p>
      </Container>

      {/* footer */}
      <Container className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-10 text-caption text-faint">
        <span>© {new Date().getFullYear()} cramBIT</span>
        <div className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-muted">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-muted">
            Privacy
          </Link>
        </div>
        <span className="w-full text-faint md:w-auto">{NOT_AFFILIATED}</span>
      </Container>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="lift border border-border">
      <MonoChip>{n}</MonoChip>
      <h3 className="mt-4 text-h3 font-normal tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-body-sm leading-relaxed text-muted">{children}</p>
    </Card>
  );
}

function PriceCard({
  name,
  price,
  note,
  highlight,
}: {
  name: string;
  price: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={
        highlight ? "lift border border-accent bg-accent-soft" : "lift border border-border"
      }
    >
      <p className="text-body-sm text-muted">{name}</p>
      <p className="mt-2 font-serif text-h2 text-text">{price}</p>
      <p className="mt-3 text-body-sm leading-relaxed text-muted">{note}</p>
    </Card>
  );
}
