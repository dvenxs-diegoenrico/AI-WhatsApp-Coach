-- Habits, vices and steps (milestone 2, part 2).
-- Run once in Supabase: SQL Editor → New query → paste → Run (after 0006).

-- One value per user, day and metric (steps from the iPhone, glasses of water, hours of sleep, drinks...).
create table if not exists public.daily_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  day        date not null,
  metric     text not null check (metric in ('pasos','agua_ml','sueno_h','alcohol_bebidas','cigarros','refrescos')),
  value      numeric(9,1) not null check (value >= 0 and value <= 100000),
  source     text not null default 'chat' check (source in ('chat','foto','atajo_ios','manual')),
  updated_at timestamptz not null default now(),
  unique (user_id, day, metric)
);
create index if not exists daily_metrics_user_day_idx on public.daily_metrics (user_id, day desc);
alter table public.daily_metrics enable row level security;

alter table public.users
  -- habits the user chose to work on (max 3), e.g. {agua_ml,sueno_h}
  add column if not exists focus_habits text[] not null default '{}',
  -- bump to invalidate the personal iPhone Shortcut link
  add column if not exists steps_token_version integer not null default 1;
