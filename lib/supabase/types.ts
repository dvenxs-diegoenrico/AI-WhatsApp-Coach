export type OnboardingStep = "age" | "consent" | "personality" | "done" | "blocked_minor";
export type Personality = "amigable" | "estricto" | "balanceado";
export type AudienceCode = "A" | "B" | "C" | "D";
export type RiskFlag = "eating_disorder" | "pregnancy" | "diabetes" | "kidney" | "heart";

export interface UserRow {
  id: string;
  wa_id: string;
  display_name: string | null;
  audience_code: AudienceCode | null;
  first_message: string | null;
  onboarding_step: OnboardingStep;
  age: number | null;
  health_consent_at: string | null;
  consent_version: string | null;
  personality: Personality | null;
  sex: "mujer" | "hombre" | null;
  risk_flags: RiskFlag[];
  restricted_mode: boolean;
  reminders_opt_in_at: string | null;
  reminders_opt_out_at: string | null;
  pending_deletion_at: string | null;
  last_inbound_at: string | null;
  message_limit_notice_at: string | null;
  photo_limit_notice_at: string | null;
  demo_photos_used: number;
  demo_questions_used: number;
  trial_used_at: string | null;
  paywall_notice_at: string | null;
  height_cm: number | null;
  goal: "bajar" | "mantener" | "subir" | null;
  activity_level: "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo" | null;
  goal_weight_kg: number | null;
  training_days: number | null;
  equipment: "ninguno" | "casa" | "gimnasio" | "parque" | null;
  experience: "principiante" | "intermedio" | "avanzado" | null;
  diet_style: string | null;
  food_dislikes: string | null;
  coach_notes: string | null;
  daily_calorie_target: number | null;
  tdee_estimate: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  fiber_target_g: number | null;
  water_target_ml: number | null;
  steps_target: number | null;
  targets_method: "ecuacion" | "adaptativo" | null;
  targets_updated_at: string | null;
  last_checkin_at: string | null;
  timezone: string;
  focus_habits: string[];
  steps_token_version: number;
  weekly_loss_target_kg: number | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  user_id: string;
  direction: "in" | "out";
  wa_message_id: string | null;
  type: "text" | "image" | "audio" | "other";
  body: string | null;
  media_path: string | null;
  model: string | null;
  created_at: string;
}

export type SubscriptionStatus =
  | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "mensual" | "anual" | null;
  status: SubscriptionStatus | null;
  price_id: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}
