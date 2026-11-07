-- Cost tracking and daily usage limits.
-- Run once in Supabase: SQL Editor → New query → paste → Run (after 0001_init.sql).

-- Real AI usage per reply (filled on outbound messages written by Claude).
alter table public.messages
  add column if not exists input_tokens  integer,
  add column if not exists output_tokens integer,
  add column if not exists ai_cost_usd   numeric(10,6);

-- When we last told the user they hit a daily limit (so we tell them once, not on every message).
alter table public.users
  add column if not exists message_limit_notice_at timestamptz,
  add column if not exists photo_limit_notice_at   timestamptz;

-- Speeds up the "how many messages in the last 24 h" check.
create index if not exists messages_user_dir_created_idx
  on public.messages (user_id, direction, created_at desc);

-- Daily cost per user. Open it in Table Editor → usage_daily, or query it in the SQL Editor:
--   select day, sum(ai_cost_usd + whatsapp_cost_usd_est) from usage_daily group by day order by day desc;
-- whatsapp_cost_usd_est assumes US$0.0085 per message we send (Mexico rate; first 1,000/month are free).
create or replace view public.usage_daily with (security_invoker = true) as
select
  u.id                                                          as user_id,
  u.audience_code,
  (m.created_at at time zone u.timezone)::date                 as day,
  count(*) filter (where m.direction = 'in')                   as messages_in,
  count(*) filter (where m.direction = 'in' and m.type = 'image') as photos_in,
  count(*) filter (where m.direction = 'out')                  as messages_out,
  coalesce(sum(m.input_tokens), 0)                             as input_tokens,
  coalesce(sum(m.output_tokens), 0)                            as output_tokens,
  coalesce(sum(m.ai_cost_usd), 0)                              as ai_cost_usd,
  round(count(*) filter (where m.direction = 'out') * 0.0085, 4) as whatsapp_cost_usd_est
from public.messages m
join public.users u on u.id = m.user_id
group by 1, 2, 3;
