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
import { ShareButton } from "@/components/share-button";
import { Reveal } from "@/components/reveal";
import { Stat } from "@/components/stat";
import { courseCount, indexedPaperCount, questionCount } from "@/lib/engine/data";
import { DISCLAIMER_SHORT, NOT_AFFILIATED } from "@/data/legal";

const SHARE_TEXT =
  "found this thing called cramBIT, it reads your course's actual past papers and your syllabus and predicts your mid-sem questions before you even open a textbook. completely free too, no card, no catch. worth trying before your exam";

export default function LandingPage() {
  const courses = courseCount();
  const papers = indexedPaperCount();
  const questions = questionCount();

  return (
    <main className="min-h-screen">
      {/* nav */}
      <Container className="flex items-center justify-between py-5 sm:py-6">
        <div className="flex items-center gap-3">
          <Wordmark size="md" />
          <MonoChip className="hidden items-center gap-1.5 border-accent/40 bg-accent-soft sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            100% free
          </MonoChip>
        </div>
        <div className="flex items-center gap-2.5">
          <ShareButton compact label="Share" text={SHARE_TEXT} className="hidden sm:flex" />
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
            come up. Two full sets, per subject, completely free.
          </p>
          <div className="rise rise-4 mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start lg:items-center">
            <ButtonLink
              href="/login"
              className="justify-center px-7 py-3.5 text-lead font-semibold"
            >
              Predict my first paper, free
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
            <Stat n={papers} kind="compact" label="previous papers" />
            <Stat n={questions} kind="compact" label="questions analysed" />
            <Stat n={courses} kind="plain" label="BIT Mesra courses" />
          </div>
        </div>

        <div className="rise rise-2 order-last lg:order-none">
          <HeroVisual />
        </div>
      </Container>

      {/* why cramBIT */}
      <Container className="py-16 sm:py-section">
        <Reveal>
          <SectionHeading
            className="mx-auto text-center md:mx-0 md:text-left"
            eyebrow="Why cramBIT"
            title="Built different, on purpose."
            lead="Not a generic AI wrapper, and not a paywall wearing a free trial costume. Here's what actually makes this worth your time."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={0}>
            <USP emoji="💸" title="Actually free">
              Every subject, every generation. No card, no cap. Six subjects, four tries
              each, that's the only limit and it's just there to keep the servers alive.
            </USP>
          </Reveal>
          <Reveal delay={100}>
            <USP emoji="📄" title="Grounded in real PYQs">
              No hallucinated questions. cramBIT reads your course's actual past mid-sem
              papers and builds from what's actually been asked before.
            </USP>
          </Reveal>
          <Reveal delay={200}>
            <USP emoji="🏫" title="Every BIT Mesra course">
              Not one department, not one campus. Engineering, B.Sc, BBA, BCA, MBA, all of
              it, and growing as more PYQs get added.
            </USP>
          </Reveal>
        </div>
      </Container>

      {/* how it works */}
      <Container id="how" className="scroll-mt-8 py-16 sm:py-section">
        <Reveal>
          <SectionHeading
            className="mx-auto text-center md:mx-0 md:text-left"
            eyebrow="How it works"
            title={
              <>
                <span className="gradient-text">PYQs</span> do the talking.
              </>
            }
            lead="Every predicted question is anchored to what your course has actually asked before and what your syllabus actually covers."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal delay={0}>
            <Step n="01" title="Pick your subject">
              Type the course code. cramBIT loads every PYQ (previous-year paper) on record for it.
            </Step>
          </Reveal>
          <Reveal delay={100}>
            <Step n="02" title="Paste the syllabus">
              Your section's syllabus becomes the hard boundary. Nothing outside it gets asked.
            </Step>
          </Reveal>
          <Reveal delay={200}>
            <Step n="03" title="Get the papers">
              A topic blueprint, a ranked pool of the most probable questions, then two
              distinct 25-mark papers. Download any set as a PDF.
            </Step>
          </Reveal>
        </div>
      </Container>

      {/* new course */}
      <Container className="py-16 sm:py-section">
        <Reveal>
          <Card className="lift glow-accent border border-border">
            <div className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:text-left">
              <MonoChip className="self-center md:self-start">new course?</MonoChip>
              <p className="text-lead leading-relaxed text-text/90">
                Brand-new subject with no PYQs on record? cramBIT still predicts your
                paper, using <span className="text-text">your syllabus</span> plus the PYQs of subjects with a <span className="mark text-text">similar syllabus</span>. It flags it too, so
                you know it's a softer prediction.
              </p>
            </div>
          </Card>
        </Reveal>
      </Container>

      {/* honesty */}
      <Container className="py-16 sm:py-section">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start">
          <Reveal>
            <SectionHeading
              className="mx-auto text-center md:mx-0 md:text-left"
              eyebrow="How accurate is this?"
              title="It's a prediction, not a leak."
              lead="cramBIT estimates what is probable from history and syllabus weightage. Some predicted questions land close to the real paper, some don't. There's no guarantee any specific question appears, and cramBIT takes no responsibility for your result. Use it to focus your revision, not to replace it."
            />
          </Reveal>
          <Reveal delay={150}>
            <Card className="lift font-mono text-body-sm text-muted">
              <p className="text-faint">{"// sample, real generated output"}</p>
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
          </Reveal>
        </div>
      </Container>

      {/* pricing */}
      <Container className="py-16 sm:py-section">
        <Reveal>
          <SectionHeading
            className="mx-auto text-center md:mx-0 md:text-left"
            eyebrow="The catch"
            title={
              <>
                There isn&apos;t <span className="gradient-text">one.</span>
              </>
            }
            lead="cramBIT is free for every subject, for everyone. Six subjects and four generations each, a fair use cap so the free infrastructure behind this actually holds up. Not a paywall in disguise."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal delay={0}>
            <PriceCard
              name="Every subject"
              price="Free"
              note="No card. No cap. Six subjects, four generations each, that's it."
              cta={{ label: "Start free", href: "/login" }}
              highlight
            />
          </Reveal>
          <Reveal delay={100}>
            <PriceCard
              name="Support cramBIT"
              price="Optional"
              note="Free for everyone stays the plan either way. If it genuinely helped, you can chip in whatever feels right, no pressure at all."
              cta={{ label: "Support cramBIT", href: "/pay" }}
            />
          </Reveal>
        </div>
        <p className="mt-4 text-center text-caption text-faint md:text-left">
          Free means free. The caps protect the free-tier infra, they're not a funnel to
          sell you anything.
        </p>
      </Container>

      {/* support */}
      <Container className="py-16 sm:py-section">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-start">
          <Reveal>
            <SectionHeading
              className="mx-auto text-center md:mx-0 md:text-left"
              eyebrow="Feedback & support"
              title="Prediction way off? Something broke? Just have thoughts?"
              lead="Tell us anything: a prediction that missed, a bug, a feature you want. You'll get an instant confirmation, then a real reply. After your exam, there's a one-tap 'how close was it?' on every generated paper too."
            />
          </Reveal>
          <Reveal delay={150}>
            <Card className="border border-border">
              <SupportForm />
            </Card>
          </Reveal>
        </div>
      </Container>

      {/* footer */}
      <Container className="flex flex-col items-center gap-4 border-t border-border py-10 text-center text-caption text-faint md:flex-row md:flex-wrap md:items-center md:justify-between md:text-left">
        <span>© {new Date().getFullYear()} cramBIT</span>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/support" className="hover:text-muted">
            Support
          </Link>
          <Link href="/terms" className="hover:text-muted">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-muted">
            Privacy
          </Link>
          <ShareButton
            compact
            label="Share cramBIT"
            text={SHARE_TEXT}
            className="[&_button]:border-none [&_button]:p-0 [&_button]:text-caption [&_button]:text-faint [&_button]:hover:text-muted"
          />
        </div>
        <span className="w-full text-faint md:w-auto">{NOT_AFFILIATED}</span>
      </Container>
    </main>
  );
}

function USP({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="lift h-full border border-border">
      <span className="text-h2 leading-none">{emoji}</span>
      <h3 className="mt-3 text-h3 font-medium tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-body leading-relaxed text-muted">{children}</p>
    </Card>
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
    <Card className="lift flex h-full flex-col items-center border border-border text-center md:items-start md:text-left">
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
          ? "lift glow-accent flex h-full flex-col items-center border border-accent bg-accent-soft text-center md:items-start md:text-left"
          : "lift flex h-full flex-col items-center border border-border text-center md:items-start md:text-left"
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
