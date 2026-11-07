-- Marketing funnel by audience code ("Hola A/B/C/D").
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Then: Table Editor → funnel_by_audience  (or: select * from funnel_by_audience;)
create or replace view public.funnel_by_audience with (security_invoker = true) as
select
  coalesce(u.audience_code, 'sin código')                                   as audience_code,
  count(*)                                                                   as started_chat,
  count(*) filter (where u.age is not null)                                  as gave_age,
  count(*) filter (where u.onboarding_step = 'blocked_minor')                as minors_blocked,
  count(*) filter (where u.health_consent_at is not null)                    as gave_consent,
  count(*) filter (where u.onboarding_step = 'done')                         as finished_signup,
  count(*) filter (where s.status in ('trialing', 'active', 'past_due'))     as subscribed_now,
  round(100.0 * count(*) filter (where u.onboarding_step = 'done') / nullif(count(*), 0), 1) as signup_rate_pct
from public.users u
left join public.subscriptions s on s.user_id = u.id
group by 1
order by 1;
