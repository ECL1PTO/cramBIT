import Link from "next/link";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  MonoChip,
  SectionHeading,
} from "@/components/ui";
import { DISCLAIMER_SHORT, NOT_AFFILIATED } from "@/data/legal";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-onyx">
      {/* nav */}
      <Container className="flex items-center justify-between py-5 sm:py-6">
        <span className="font-mono text-body-sm font-medium tracking-tight text-ivory">
          cramBIT<span className="text-cobalt">_</span>
        </span>
        <ButtonLink href="/login" variant="ghost" className="px-4 py-2">
          Log in
        </ButtonLink>
      </Container>

      {/* hero */}
      <Container className="pt-12 pb-section sm:pt-16">
        <div className="max-w-3xl">
          <Badge className="rise rise-1">BIT Mesra · Noida campus</Badge>
          <h1 className="rise rise-2 mt-6 text-[2.35rem] font-normal leading-[1.08] tracking-tight text-ivory sm:text-h1 md:text-[3.5rem] lg:text-display">
            Walk into your mid-sem having already{" "}
            <span className="font-serif italic text-ash">seen the paper.</span>
          </h1>
          <p className="rise rise-3 mt-6 max-w-xl text-body leading-relaxed text-ash sm:text-lead">
            cramBIT reads the real past mid-sem papers for your course, cross-references
            your syllabus, and writes the 25-mark question papers most likely to come up —
            three to four full sets, per subject.
          </p>
          <div className="rise rise-3 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/login" className="justify-center">
              Predict my first paper — free
            </ButtonLink>
            <Link
              href="#how"
              className="px-4 py-2 text-center text-body-sm text-ash transition-colors hover:text-ivory"
            >
              How it works
            </Link>
          </div>
          <p className="mt-5 text-caption text-faint">{DISCLAIMER_SHORT}</p>
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
          <Step
            n="01"
            title="Pick your subject"
            body="Type the course code. cramBIT pulls the stored syllabus and every past mid-sem paper on record for it."
          />
          <Step
            n="02"
            title="Confirm the syllabus"
            body="Paste your section's syllabus if it differs. That becomes the hard boundary — nothing out of syllabus gets asked."
          />
          <Step
            n="03"
            title="Get the papers"
            body="A frequency blueprint of topics and question styles, then three distinct 25-mark papers. Download as PDF, or ask the tutor to solve any question."
          />
        </div>
      </Container>

      {/* honesty */}
      <Container className="py-16 sm:py-section">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
          <SectionHeading
            eyebrow="How accurate is this?"
            title="It's a prediction, not a leak."
            lead="cramBIT estimates what is probable from history and syllabus weightage. Some predicted questions land close to the real paper; some don't. There is no guarantee any specific question appears, and cramBIT takes no responsibility for your result. Use it to focus your revision, not to replace it."
          />
          <Card className="font-mono text-body-sm text-ash">
            <p className="text-faint">{"// sample — real generated output"}</p>
            <p className="mt-3 text-ivory">Q1. (a) Define time–space trade-off with an
              example. <span className="text-faint">(2)</span></p>
            <p className="mt-2 text-ivory">(b) Write an algorithm to insert a node at the
              k-th position of a singly linked list and state its complexity.{" "}
              <span className="text-faint">(3)</span></p>
            <p className="mt-4 text-faint">{"// appeared in 3 of 4 past sessions"}</p>
          </Card>
        </div>
      </Container>

      {/* pricing */}
      <Container className="py-16 sm:py-section">
        <SectionHeading eyebrow="Pricing" title="Your first subject is free." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <PriceCard
            name="First subject"
            price="Free"
            note="One full prediction, any course. No card needed."
          />
          <PriceCard
            name="Per subject"
            price="—"
            note="Unlock one more subject. Price shown at checkout."
          />
          <PriceCard
            name="Season bundle"
            price="₹199"
            note="Every subject you have this mid-sem season."
            highlight
          />
        </div>
        <p className="mt-4 text-caption text-faint">
          Payment is for access to the tool, not for results. No refunds on prediction
          accuracy.
        </p>
      </Container>

      {/* footer */}
      <Container className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline py-10 text-caption text-faint">
        <span>© {new Date().getFullYear()} cramBIT</span>
        <div className="flex items-center gap-5">
          <Link href="/terms" className="hover:text-ash">Terms</Link>
          <Link href="/privacy" className="hover:text-ash">Privacy</Link>
        </div>
        <span className="w-full text-faint md:w-auto">{NOT_AFFILIATED}</span>
      </Container>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <Card>
      <MonoChip>{n}</MonoChip>
      <h3 className="mt-4 text-h3 font-normal tracking-tight text-ivory">{title}</h3>
      <p className="mt-2 text-body-sm leading-relaxed text-ash">{body}</p>
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
    <Card className={highlight ? "ring-1 ring-cobalt" : undefined}>
      <p className="text-body-sm text-ash">{name}</p>
      <p className="mt-2 font-serif text-h2 text-ivory">{price}</p>
      <p className="mt-3 text-body-sm leading-relaxed text-ash">{note}</p>
    </Card>
  );
}
