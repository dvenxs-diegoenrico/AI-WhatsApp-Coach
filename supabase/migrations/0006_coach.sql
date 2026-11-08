-- Milestone 2: expert coach (full profile, targets, adaptive expenditure, memory) and dashboard.
-- Run once in Supabase: SQL Editor → New query → paste → Run (after 0005).

alter table public.users
  add column if not exists goal_weight_kg      numeric(5,1) check (goal_weight_kg is null or goal_weight_kg between 30 and 300),
  add column if not exists training_days       smallint check (training_days is null or training_days between 0 and 7),
  add column if not exists equipment           text check (equipment in ('ninguno','casa','gimnasio','parque')),
  add column if not exists experience          text check (experience in ('principiante','intermedio','avanzado')),
  add column if not exists diet_style          text check (diet_style is null or length(diet_style) <= 120),
  add column if not exists food_dislikes       text check (food_dislikes is null or length(food_dislikes) <= 300),
  add column if not exists coach_notes         text check (coach_notes is null or length(coach_notes) <= 2000),
  -- targets (always computed in code, never by the AI)
  add column if not exists tdee_estimate       integer check (tdee_estimate is null or tdee_estimate between 900 and 6000),
  add column if not exists protein_target_g    integer check (protein_target_g is null or protein_target_g between 30 and 300),
  add column if not exists carbs_target_g      integer check (carbs_target_g is null or carbs_target_g between 0 and 800),
  add column if not exists fat_target_g        integer check (fat_target_g is null or fat_target_g between 20 and 250),
  add column if not exists fiber_target_g      integer,
  add column if not exists water_target_ml     integer,
  add column if not exists steps_target        integer,
  add column if not exists targets_method      text check (targets_method in ('ecuacion','adaptativo')),
  add column if not exists targets_updated_at  timestamptz,
  add column if not exists last_checkin_at     timestamptz;

alter table public.meals
  add column if not exists meal_type text check (meal_type in ('desayuno','comida','cena','colacion','otro')),
  add column if not exists fiber_g   numeric(6,1);

alter table public.workouts
  add column if not exists intensity text check (intensity in ('suave','moderada','intensa'));
