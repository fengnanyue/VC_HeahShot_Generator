-- Track processed Stripe webhook events for idempotency
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

-- Optional: keep table private; only service role should write/read
alter table public.stripe_webhook_events enable row level security;

-- No RLS policies on purpose: service role bypasses RLS, anon/auth should have no access.

