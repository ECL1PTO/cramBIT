# cramBIT data pipeline

All offline. Output is committed JSON in `src/data/` — the app never scrapes at runtime.
PDF text is read locally with `pdf-parse` and structured with Groq (`GROQ_API_KEY`).
Seeding also needs `SUPABASE_SERVICE_ROLE_KEY`. Both in `.env.local`.

Run in order:

| Step | Command | Output | Notes |
|---|---|---|---|
| 1 | `node scripts/scrape-courses.mjs` | `src/data/courses.json` | Reads the structure PDFs in `project_reference/syllabus_pdfs/`. BIT **Noida** catalogue only. Starts fresh each run. |
| 2 | `node scripts/scrape-archive.mjs` | `project_reference/pyq_pdfs/`, `pyq_manifest.json` | Crawls all 18 departments of `archive.bitmesra.ac.in`. Resumable. ~30–60 min. PDFs gitignored. |
| 3 | `node scripts/extract-pyqs.mjs [Dept ...]` | `src/data/pyqs/*.json`, `src/data/pyq_corpus.json` | **pdf-parse only, no LLM** — just the raw paper text per course (MID only). Fast, free, unlimited. The engine derives topics from the raw text at generation time. Scanned/image PDFs skipped → `scanned_pdfs.json`. |
| 4 | `node scripts/build-index.mjs` | `src/data/index.json`, updates `courses.json` grounding | Per-course topic frequency + global similarity corpus. Fast, re-run anytime. |
| 5 | `node scripts/seed-subjects.mjs` | Supabase `subjects` table | Run after the migration. Re-run whenever `courses.json` changes. |

Steps 1 and 4–5 are cheap. Step 2 is the heavy crawl; commit its JSON + the extracted `src/data/` output.

`legacy/` holds the previous agent's superseded script, kept for reference only.
