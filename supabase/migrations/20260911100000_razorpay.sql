-- Razorpay support on the existing payment_claims flow. A Razorpay order maps
-- to one claim; the payment.captured webhook flips it to 'approved' and the
-- existing grant_entitlement_on_approval trigger does the rest.

alter table public.payment_claims
  add column if not exists provider     text not null default 'upi',
  add column if not exists provider_ref text;

-- Razorpay claims have no UTR.
alter table public.payment_claims
  alter column upi_utr drop not null;

-- The old global-unique index on upi_utr breaks with multiple NULLs on some
-- setups; make it explicitly partial.
drop index if exists payment_claims_utr_unique;
create unique index if not exists payment_claims_utr_unique
  on public.payment_claims (upi_utr) where upi_utr is not null;

create unique index if not exists payment_claims_provider_ref_unique
  on public.payment_claims (provider_ref) where provider_ref is not null;

-- Let the service role (webhook / order route) insert claims on the user's
-- behalf — the browser only ever calls the order route, never inserts directly.
-- (RLS insert policy already allows auth.uid() = user_id; service role bypasses.)
