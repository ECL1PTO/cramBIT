-- cramBIT rebuild: real entitlement model, anti-abuse hardening, payment claims.
-- Safe to run on the pre-launch DB. Drops the empty/testing tables and recreates them.

-- ============================================================ profiles hardening

alter table public.profiles
  add column if not exists disclaimer_ack_at timestamptz;

-- Column-level lockdown: authenticated users may only edit cosmetic fields.
revoke update on public.profiles from authenticated;
grant  update (full_name, avatar_url, disclaimer_ack_at) on public.profiles to authenticated;

-- Belt-and-braces: reject privileged-column changes even if a policy is loosened later.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if new.id <> old.id
     or new.email <> old.email
     or new.is_admin <> old.is_admin
     or new.free_credits <> old.free_credits
     or new.paid_credits <> old.paid_credits then
    raise exception 'protected profile column modified';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row
  when (auth.role() = 'authenticated')
  execute function public.protect_profile_columns();

-- ============================================================ subjects (Noida catalogue)

drop table if exists public.subjects cascade;

create table public.subjects (
  code        text primary key,
  name        text not null,
  programs    text[] not null default '{}',
  semester    integer,
  credits     numeric,
  syllabus    text,
  campus      text not null default 'Noida',
  grounding   text not null default 'none',   -- full | partial | none
  pyq_count   integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "subjects readable by all"
  on public.subjects for select using (true);

-- ============================================================ generated papers

drop table if exists public.generated_papers cascade;

create table public.generated_papers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_code text references public.subjects(code),   -- null => unknown/new course
  course_input text not null,                           -- what the user actually typed
  syllabus_text text not null,
  coverage     text not null,                           -- full | syllabus-only | new-course
  blueprint    jsonb,
  sets         jsonb not null,                          -- string[] of markdown papers
  set_count    integer not null,
  is_paid      boolean not null,                        -- false => consumed the free credit
  created_at   timestamptz not null default now()
);

create index generated_papers_user_paid_idx
  on public.generated_papers (user_id, is_paid);

alter table public.generated_papers enable row level security;

create policy "own papers readable"
  on public.generated_papers for select using (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policy: only the service role (API route) writes here.

-- ============================================================ entitlements

create table public.entitlements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  scope        text not null check (scope in ('subject', 'bundle')),
  subject_code text references public.subjects(code),
  active       boolean not null default true,
  source       text not null check (source in ('free', 'upi')),
  granted_at   timestamptz not null default now(),
  constraint entitlement_scope_shape check (
    (scope = 'subject' and subject_code is not null) or
    (scope = 'bundle'  and subject_code is null)
  )
);

create unique index entitlements_unique_subject
  on public.entitlements (user_id, subject_code)
  where scope = 'subject';
create unique index entitlements_unique_bundle
  on public.entitlements (user_id)
  where scope = 'bundle';
create index entitlements_lookup_idx
  on public.entitlements (user_id, subject_code, active);

alter table public.entitlements enable row level security;

create policy "own entitlements readable"
  on public.entitlements for select using (auth.uid() = user_id);
-- No write policy at all: entitlements are created ONLY by the grant trigger below.

-- ============================================================ payment claims

create table public.payment_claims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  plan         text not null check (plan in ('subject', 'bundle')),
  subject_code text references public.subjects(code),
  amount       integer not null,                 -- server-computed, in rupees
  upi_utr      text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewer     text
);

create unique index payment_claims_utr_unique on public.payment_claims (upi_utr);
create unique index payment_claims_one_open
  on public.payment_claims (user_id, plan, coalesce(subject_code, ''))
  where status = 'pending';
create index payment_claims_status_idx on public.payment_claims (status);

alter table public.payment_claims enable row level security;

create policy "own claims readable"
  on public.payment_claims for select using (auth.uid() = user_id);
create policy "own claims insertable"
  on public.payment_claims for insert with check (auth.uid() = user_id and status = 'pending');
-- Status changes: service role only (Telegram webhook / admin route).

-- Grant entitlement when a claim is approved.
create or replace function public.grant_entitlement_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    if new.plan = 'bundle' then
      insert into public.entitlements (user_id, scope, source)
      values (new.user_id, 'bundle', 'upi')
      on conflict do nothing;
    else
      insert into public.entitlements (user_id, scope, subject_code, source)
      values (new.user_id, 'subject', new.subject_code, 'upi')
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists grant_entitlement_on_approval on public.payment_claims;
create trigger grant_entitlement_on_approval
  after update on public.payment_claims
  for each row execute function public.grant_entitlement_on_approval();

-- ============================================================ blueprint cache

create table public.blueprints (
  id            uuid primary key default gen_random_uuid(),
  subject_key   text not null,           -- course code, or 'new:' || hash
  syllabus_hash text not null,
  blueprint     jsonb not null,
  created_at    timestamptz not null default now()
);

create unique index blueprints_key_unique on public.blueprints (subject_key, syllabus_hash);
alter table public.blueprints enable row level security;
-- Read/write via service role only; no public policies.

-- ============================================================ rate limiting

create table public.rate_limits (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  bucket    text not null,               -- 'generate' | 'chat'
  window_start timestamptz not null default now(),
  count     integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.rate_limits enable row level security;
-- Service role only.

-- ============================================================ admin seed

update public.profiles set is_admin = true where email = 'redacted@example.com';
