import Link from "next/link";
import {
  ButtonLink,
  Card,
  Container,
  MonoChip,
  SectionHeading,
} from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SupportForm } from "@/components/support-form";
import { HeroVisual } from "@/components/hero-visual";
import { courseCount, indexedPaperCount, questionCount } from "@/lib/engine/data";
import { PRICING } from "@/data/pricing";
import { DISCLAIMER_SHORT, NOT_AFFILIATED } from "@/data/legal";

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export default function LandingPage() {
  const courses = courseCount();
  const papers = indexedPaperCount();
  const questions = questionCount();

  return (
    <main className="min-h-screen">
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
      <Container className="relative grid items-center gap-14 pt-14 pb-16 sm:pt-20 sm:pb-section lg:grid-cols-[1.05fr_0.95fr]">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <h1 className="rise rise-1 text-[2.7rem] font-medium leading-[1.03] tracking-tight text-text sm:text-[3.4rem] md:text-[4.2rem] lg:text-[4.75rem]">
            Walk into your mid-sem
            <br className="hidden sm:block" /> having already{" "}
            <span className="shimmer font-serif italic">seen the paper.</span>
          </h1>
          <p className="rise rise-3 mx-auto mt-6 max-w-xl text-lead leading-relaxed text-text/90 sm:text-[1.3rem] lg:mx-0">
            cramBIT reads every <a href="#how" className="underline decoration-dotted decoration-accent underline-offset-4 hover:text-text">PYQ</a> for your course, cross-references your syllabus, and writes the{" "}
            <span className="mark text-text">25-mark question papers</span> most likely to
            come up. Three full sets, per subject.
          </p>
          <div className="rise rise-4 mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start lg:items-center">
            <ButtonLink
              href="/login"
              className="justify-center px-7 py-3.5 text-lead font-semibold"
            >
              Predict my first paper — free
            </ButtonLink>
            <Link
              href="#how"
              className="px-4 py-2 text-center text-body text-muted transition-colors hover:text-text"
            >
              How it works ↓
            </Link>
          </div>
          <p className="rise rise-4 mt-5 text-body-sm text-muted">{DISCLAIMER_SHORT}</p>

          {/* stat strip */}
          <div className="rise rise-4 mx-auto mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6 lg:mx-0">
            <Stat value={`${compact(papers)}`} label="previous papers" />
            <Stat value={`${compact(questions)}`} label="questions analysed" />
            <Stat value={courses.toLocaleString()} label="BIT Noida courses" />
          </div>
        </div>

        <div className="rise rise-2 order-last lg:order-none">
          <HeroVisual />
        </div>
      </Container>

      {/* how it works */}
      <Container id="how" className="scroll-mt-8 py-16 sm:py-section">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              <span className="gradient-text">PYQs</span> do the talking.
            </>
          }
          lead="Not a generic AI guess. Every predicted question is anchored to what your course has actually asked before and what your syllabus actually covers."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Step n="01" title="Pick your subject">
            Type the course code. cramBIT loads every PYQ (previous-year paper) on record for it.
          </Step>
          <Step n="02" title="Paste the syllabus">
            Your section&apos;s syllabus becomes the hard boundary — nothing outside it is asked.
          </Step>
          <Step n="03" title="Get the papers">
            A topic blueprint, a ranked pool of the most probable questions, then three
            distinct 25-mark papers. Download any set as a PDF.
          </Step>
        </div>
      </Container>

      {/* new course */}
      <Container className="py-16 sm:py-section">
        <Card className="lift glow-accent border border-border">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <MonoChip className="self-start">new course?</MonoChip>
            <p className="text-lead leading-relaxed text-text/90">
              Brand-new subject with no PYQs on record? cramBIT still predicts your
              paper — from <span className="text-text">your syllabus</span> plus the PYQs of subjects with a <span className="mark text-text">similar syllabus</span>, then flags it so
              you know it&apos;s a softer prediction.
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
          title={
            <>
              First subject <span className="gradient-text">free</span>. Try it against a real
              exam.
            </>
          }
          lead="Generate your first subject for free, sit the exam, and see for yourself how close it lands. If it's worth it, come back and unlock the rest."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <PriceCard
            name="First subject"
            price="Free"
            note="One full prediction, any course. No card."
            cta={{ label: "Start free", href: "/login" }}
          />
          <PriceCard
            name="Per subject"
            price={`₹${PRICING.perSubject}`}
            note="Unlock any one extra subject and all its predicted papers. Pick which one after you log in."
            cta={{ label: "Log in to unlock", href: "/login" }}
          />
          <PriceCard
            name="Season bundle"
            price={`₹${PRICING.bundle}`}
            note="Every subject you take this mid-sem season — up to 5. The obvious pick if you have 3 or more."
            cta={{ label: "Unlock 5 subjects", href: "/pay?plan=bundle" }}
            highlight
          />
        </div>
        <p className="mt-4 text-caption text-faint">
          Payment unlocks the tool, not a result. No refunds on prediction accuracy.
        </p>
      </Container>

      {/* support */}
      <Container className="py-16 sm:py-section">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
          <SectionHeading
            eyebrow="Feedback & support"
            title="Prediction way off? Something broke? Just have thoughts?"
            lead="Tell us anything — a prediction that missed, a bug, a feature you want. You'll get an instant confirmation, then a real reply. After your exam, there's a one-tap 'how close was it?' on every generated paper too."
          />
          <Card className="border border-border">
            <SupportForm />
          </Card>
        </div>
      </Container>

      {/* footer */}
      <Container className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-10 text-caption text-faint">
        <span>© {new Date().getFullYear()} cramBIT</span>
        <div className="flex items-center gap-5">
          <Link href="/support" className="hover:text-muted">
            Support
          </Link>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-h1 leading-none text-text">{value}</p>
      <p className="mt-2 text-body-sm text-muted">{label}</p>
    </div>
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
      <h3 className="mt-4 text-h3 font-medium tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-body leading-relaxed text-muted">{children}</p>
    </Card>
  );
}

function PriceCard({
  name,
  price,
  note,
  highlight,
  cta,
}: {
  name: string;
  price: string;
  note: string;
  highlight?: boolean;
  cta?: { label: string; href: string };
}) {
  return (
    <Card
      className={
        highlight
          ? "lift glow-accent flex flex-col border border-accent bg-accent-soft"
          : "lift flex flex-col border border-border"
      }
    >
      <p className="text-body-sm text-muted">{name}</p>
      <p className="mt-2 font-serif text-h1 text-text">{price}</p>
      <p className="mt-3 text-body-sm leading-relaxed text-muted">{note}</p>
      {cta && (
        <Link
          href={cta.href}
          className={`mt-5 inline-block rounded-pill px-4 py-2 text-center text-body-sm font-medium transition-colors ${
            highlight
              ? "bg-accent text-white hover:bg-accent-hover"
              : "border border-border text-text hover:border-accent/50"
          }`}
        >
          {cta.label}
        </Link>
      )}
    </Card>
  );
}
