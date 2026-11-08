-- Milestone 3: payments with Stripe (free demo → 3-day trial with card → subscription).
-- Run once in Supabase: SQL Editor → New query → paste → Run (after 0004).

alter table public.users
  add column if not exists demo_photos_used    integer not null default 0,
  add column if not exists demo_questions_used integer not null default 0,
  add column if not exists trial_used_at       timestamptz,   -- the 3-day trial is offered once per WhatsApp number
  add column if not exists paywall_notice_at   timestamptz;   -- last "subscribe to continue" message (sent at most hourly)

alter table public.subscriptions
  add column if not exists price_id             text,
  add column if not exists cancel_at_period_end boolean not null default false;

create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- Stripe can send the same event more than once; we record each id to process it only once.
create table if not exists public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
