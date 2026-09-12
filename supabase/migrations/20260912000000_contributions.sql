-- cramBIT is now free for everyone — the whole paid-plan / entitlement-grant
-- machinery (payment_claims -> entitlements trigger) is retired. This table
-- replaces it with a single, simple "support us" tip jar: voluntary,
-- self-chosen amount, no unlock tied to it whatsoever.

create table public.contributions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  amount       integer not null check (amount > 0), -- rupees
  provider     text not null default 'razorpay',
  provider_ref text,
  created_at   timestamptz not null default now()
);

create unique index contributions_provider_ref_unique
  on public.contributions (provider_ref) where provider_ref is not null;

alter table public.contributions enable row level security;

create policy "users can view own contributions"
  on public.contributions for select using (auth.uid() = user_id);

create policy "admin can view all contributions"
  on public.contributions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- No insert/update/delete policy for authenticated users — only the service
-- role (the Razorpay webhook) ever writes a row, after a real payment.captured
-- event with a verified signature.
