```
 ██████╗██████╗  █████╗ ███╗   ███╗██████╗ ██╗████████╗
██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔══██╗██║╚══██╔══╝
██║     ██████╔╝███████║██╔████╔██║██████╔╝██║   ██║
██║     ██╔══██╗██╔══██║██║╚██╔╝██║██╔══██╗██║   ██║
╚██████╗██║  ██║██║  ██║██║ ╚═╝ ██║██████╔╝██║   ██║
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝   ╚═╝
```
<p align="center"><i>&gt;_ walk into your mid-sem having already seen the paper.</i></p>

<p align="center">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-5b6ef5?style=flat-square">
  <img alt="stack" src="https://img.shields.io/badge/next.js-16-000000?style=flat-square">
  <img alt="status" src="https://img.shields.io/badge/status-live-7ee787?style=flat-square">
  <img alt="cost" src="https://img.shields.io/badge/infra-%E2%82%B90%2Fmo-8a90ff?style=flat-square">
</p>

---

```
> WHAT IS THIS
```

**cramBIT** predicts your mid-semester question paper. Type a course code, paste
your syllabus, and a multi-pass AI engine reads that course's real past
mid-sem papers, cross-references them against your syllabus, and hands back
two distinct, structurally-correct 25-mark predicted papers — ranked by
what's actually likely to be asked, not a generic guess.

Built for **BIT Mesra** — every campus — BBA, BCA, B.Com, MCA, MBA, engineering, and the
B.Sc programmes — off a self-scraped corpus of ~1,400 real past papers across
840 courses. Completely free for everyone — up to 6 subjects, 4 generations
each, a fair-use cap rather than a paywall. It runs on entirely free-tier
infrastructure; an optional "support us" contribution (any self-chosen
amount) helps keep it running.

Not affiliated with, endorsed by, or connected to Birla Institute of
Technology, Mesra. Predictions are AI estimates with no accuracy guarantee.

```
> HOW IT ACTUALLY WORKS
```

No single "write me a paper" prompt. Every generation is four passes:

```
 ① BLUEPRINT           read every real past paper for the course (or the
                        closest-matching courses, if this one has none),
                        derive per-module frequency, recurring phrasings,
                        near-verbatim repeats, and which topics are "due"

 ② CANDIDATE POOL       rank ≥16 probable sub-questions against that
                        blueprint, each with a probability + rationale

 ③ ASSEMBLY             assemble 3 distinct 25-mark papers from the pool —
                        5 questions × (2-mark + 3-mark), strictly in-syllabus

 ④ VALIDATION           structural + scope-check pass; a failing set gets
                        rebuilt once before it ever reaches you
```

The blueprint and candidate pool are cached per (course, syllabus) — a
regeneration on the same syllabus only re-runs the cheap assembly step.

```
> STACK
```

| Layer | What |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 |
| Auth + DB | Supabase (Postgres, RLS, magic-link auth restricted to `@bitmesra.ac.in`) |
| Inference | Self-hosted [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway on an Oracle Cloud free-tier VM — quota-aware failover across Groq, NVIDIA NIM, OpenRouter, Gemini and more, so no single free-tier daily cap can take the product down |
| Support | Razorpay Checkout — fully optional, self-chosen-amount "support us" contribution. Nothing is gated behind it. |
| Email | Gmail SMTP, branded templates, zero cost |
| Data | Fully offline pipeline — no runtime scraping. PDFs → text → per-course JSON, committed to the repo |
| Hosting | Vercel (free tier) |

Every piece above runs on a free tier. The only real cost in the whole
system is a ~2% payment-processor fee on money the product actually earns.

```
> THE DATA
```

`src/data/` ships a self-scraped, offline-processed corpus — no third-party
dataset, no scraping at request time:

- `courses.json` — the BIT Mesra programme catalogue, every campus (course code → name,
  programme, semester, syllabus)
- `pyqs/<CODE>.json` — real extracted mid-semester papers per course
- `index.json` — a keyword-frequency similarity index, so a brand-new or
  thin-history course still borrows patterns from its closest neighbours
  instead of guessing blind

Rebuilding it is a four-step offline pipeline (`scripts/`):

```bash
node scripts/scrape-archive.mjs   # crawl the public archive -> PDFs + manifest
node scripts/extract-pyqs.mjs     # pdf-parse only, no LLM -> src/data/pyqs/*.json
node scripts/build-index.mjs      # keyword frequency + similarity corpus
node scripts/seed-subjects.mjs    # push courses.json into Supabase
```

```
> RUNNING IT YOURSELF
```

```bash
git clone https://github.com/ECL1PTO/cramBIT.git
cd cramBIT
npm install
cp .env.example .env.local        # fill in the values below
npm run dev
```

**Required:** a Supabase project + at least one free LLM key (Groq, Gemini,
or an OpenAI-compatible gateway like OmniRoute). Everything else — Razorpay,
Telegram, SMTP — is optional and the app degrades gracefully without it.

See `.env.example` for the full list, and **`DEPLOY.md`** for a complete,
click-by-click path to a $0/month production deployment (Vercel + a
self-hosted OmniRoute gateway on Oracle Cloud's free tier).

```
> PROJECT LAYOUT
```

```
src/
├─ app/                 routes — landing, dashboard, pay, admin, legal pages,
│                        and every /api endpoint (predict, payments, support)
├─ components/           UI primitives + the paywall, feedback and support widgets
├─ lib/
│  ├─ engine/            the 4-pass predictor: prompts, LLM routing, validation
│  ├─ entitlement.ts     fair-use generation caps — server-side, RLS-backed
│  ├─ razorpay.ts        order creation + webhook signature verification
│  └─ notify.ts          transactional email (SMTP-first, Resend fallback)
├─ data/                 the offline-built course + PYQ corpus
└─ utils/supabase/       browser / server / service-role clients

scripts/                 the offline scrape → extract → index → seed pipeline
supabase/migrations/     schema, RLS policies, entitlement-granting triggers
```

```
> LICENSE
```

MIT — see [`LICENSE`](./LICENSE). Fork it, run it for your own campus, ship
it better than this. Just keep the disclaimers honest: it predicts, it
doesn't leak, and it isn't affiliated with any institution it's built for.

<p align="center"><sub>cram<b>BIT</b>_</sub></p>
