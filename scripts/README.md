# cramBIT data pipeline

All offline. Output is committed JSON in `src/data/` — the app never scrapes at runtime.
Needs `GEMINI_API_KEY` and (for seeding) `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Run in order:

| Step | Command | Output | Notes |
|---|---|---|---|
| 1 | `node scripts/scrape-courses.mjs` | `src/data/courses.json` | Gemini reads the structure PDFs in `project_reference/syllabus_pdfs/`. BIT **Noida** catalogue only. |
| 2 | `node scripts/scrape-archive.mjs` | `project_reference/pyq_pdfs/`, `pyq_manifest.json` | Crawls all 18 departments of `archive.bitmesra.ac.in`. Resumable. ~30–60 min. PDFs are gitignored. |
| 3 | `node scripts/extract-pyqs.mjs` | `src/data/pyqs/*.json`, `src/data/pyq_corpus.json` | Gemini transcribes each paper to structured JSON + topic tags. Resumable. Slow (1 call/paper). |
| 4 | `node scripts/build-index.mjs` | `src/data/index.json`, updates `courses.json` grounding | Per-course topic frequency + global similarity corpus. Fast, re-run anytime. |
| 5 | `node scripts/seed-subjects.mjs` | Supabase `subjects` table | Run after the migration. Re-run whenever `courses.json` changes. |

Steps 1 and 4–5 are cheap. Steps 2–3 are the heavy crawl; commit their JSON output.

`legacy/` holds the previous agent's superseded script, kept for reference only.
