-- Cache the ranked candidate pool next to the blueprint. Both are a pure
-- function of (subject_key, syllabus_hash), so a regeneration with an unchanged
-- syllabus can skip passes 1 AND 2 and only re-run assembly.

alter table public.blueprints
  add column if not exists pool jsonb;
