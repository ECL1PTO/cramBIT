-- Feedback: how did a prediction land, and free-form thoughts.

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  email         text,
  kind          text not null default 'general' check (kind in ('accuracy', 'general')),
  subject_code  text,
  rating        text check (rating in ('nailed', 'close', 'off')),
  message       text,
  created_at    timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Any signed-in user may leave feedback about their own activity.
create policy "leave own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

-- Only admins read it back through the API (service role bypasses RLS anyway).
create policy "admin reads feedback"
  on public.feedback for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
