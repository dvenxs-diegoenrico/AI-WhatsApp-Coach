-- Milestone 1: initial schema for the AI WhatsApp coach.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- Product rules enforced here (in addition to the app code):
--   * age must be 18+ (users.age check)
--   * daily calorie target never below 1,200 kcal (mujer) / 1,500 kcal (hombre)
--   * weekly loss target never above 1.0 kg
--   * audience_code is written once from the first message and can never change
--   * onboarding can't be 'done' without age, health-data consent and personality
--   * calories from photos are always flagged as estimates
--   * deleting a user deletes all of their rows (on delete cascade)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id                     uuid primary key default gen_random_uuid(),
  wa_id                  text not null unique,              -- WhatsApp phone id, e.g. 5215512345678
  display_name           text,                              -- WhatsApp profile name
  audience_code          text check (audience_code in ('A','B','C','D')),
  first_message          text,

  onboarding_step        text not null default 'age'
                         check (onboarding_step in ('age','consent','personality','done','blocked_minor')),
  age                    smallint check (age is null or (age >= 18 and age <= 120)),
  health_consent_at      timestamptz,
  consent_version        text,
  personality            text check (personality in ('amigable','estricto','balanceado')),

  -- profile (filled in milestone 2)
  sex                    text check (sex in ('mujer','hombre')),
  height_cm              numeric(5,1) check (height_cm is null or height_cm between 120 and 230),
  goal                   text check (goal in ('bajar','mantener','subir')),
  activity_level         text check (activity_level in ('sedentario','ligero','moderado','activo','muy_activo')),
  daily_calorie_target   integer,
  weekly_loss_target_kg  numeric(3,2)
                         check (weekly_loss_target_kg is null or (weekly_loss_target_kg >= 0 and weekly_loss_target_kg <= 1.0)),

  -- safety
  risk_flags             text[] not null default '{}',
  restricted_mode        boolean not null default false,    -- true = general guidance only

  -- reminders (milestone 4)
  reminders_opt_in_at    timestamptz,
  reminders_opt_out_at   timestamptz,
  timezone               text not null default 'America/Mexico_City',

  pending_deletion_at    timestamptz,                       -- set by "BORRAR MIS DATOS", cleared after 10 min
  last_inbound_at        timestamptz,                       -- WhatsApp 24h customer-service window
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint calorie_floor check (
    daily_calorie_target is null
    or (sex is not null and daily_calorie_target >= case when sex = 'hombre' then 1500 else 1200 end)
  ),
  constraint done_requires_onboarding check (
    onboarding_step <> 'done'
    or (age is not null and health_consent_at is not null and personality is not null)
  )
);

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- audience_code and first_message are write-once.
create or replace function public.prevent_audience_change()
returns trigger language plpgsql as $$
begin
  if old.audience_code is distinct from new.audience_code
     or old.first_message is distinct from new.first_message then
    raise exception 'audience_code and first_message cannot be changed';
  end if;
  return new;
end $$;

create trigger users_audience_immutable before update on public.users
  for each row execute function public.prevent_audience_change();

-- ---------------------------------------------------------------------------
-- messages (every inbound and outbound WhatsApp message)
-- ---------------------------------------------------------------------------
create table public.messages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  direction      text not null check (direction in ('in','out')),
  wa_message_id  text unique,                 -- Meta retries webhooks; unique id = no double replies
  type           text not null check (type in ('text','image','audio','other')),
  body           text,
  media_path     text,
  model          text,                        -- Claude model that wrote an outbound reply
  created_at     timestamptz not null default now()
);
create index messages_user_created_idx on public.messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- photos (files live in the private "photos" storage bucket)
-- ---------------------------------------------------------------------------
create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  storage_path  text not null,
  wa_media_id   text,
  mime_type     text,
  kind          text not null default 'meal' check (kind in ('meal','progress','unknown')),
  created_at    timestamptz not null default now()
);
create index photos_user_idx on public.photos (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- meals
-- ---------------------------------------------------------------------------
create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  eaten_at     timestamptz not null default now(),
  description  text not null,
  calories     integer check (calories is null or calories >= 0),
  protein_g    numeric(6,1),
  carbs_g      numeric(6,1),
  fat_g        numeric(6,1),
  source       text not null check (source in ('text','photo','manual')),
  photo_id     uuid references public.photos(id) on delete set null,
  is_estimate  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint photo_meals_are_estimates check (source <> 'photo' or is_estimate)
);
create index meals_user_eaten_idx on public.meals (user_id, eaten_at desc);

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
create table public.workouts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  performed_at   timestamptz not null default now(),
  kind           text not null,
  duration_min   integer check (duration_min is null or duration_min between 1 and 600),
  est_calories   integer check (est_calories is null or est_calories >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);
create index workouts_user_idx on public.workouts (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- weights
-- ---------------------------------------------------------------------------
create table public.weights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  measured_at  timestamptz not null default now(),
  weight_kg    numeric(5,1) not null check (weight_kg between 30 and 300),
  created_at   timestamptz not null default now()
);
create index weights_user_idx on public.weights (user_id, measured_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions (milestone 3, Stripe)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references public.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  plan                    text check (plan in ('mensual','anual')),
  status                  text,              -- trialing, active, past_due, canceled, ...
  trial_end               timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- deletion_log (proof that a deletion happened, without personal data)
-- ---------------------------------------------------------------------------
create table public.deletion_log (
  id             uuid primary key default gen_random_uuid(),
  wa_id_hash     text not null,              -- sha256 of the phone number
  audience_code  text,
  requested_at   timestamptz not null,
  completed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, no public policies.
-- Only the server (service role key) can read or write.
-- ---------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.messages       enable row level security;
alter table public.photos         enable row level security;
alter table public.meals          enable row level security;
alter table public.workouts       enable row level security;
alter table public.weights        enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.deletion_log   enable row level security;

-- ---------------------------------------------------------------------------
-- Private storage bucket for photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
