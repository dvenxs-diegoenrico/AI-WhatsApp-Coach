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
