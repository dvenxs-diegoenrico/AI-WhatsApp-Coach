import { CONSENT_VERSION, personalityLabel, t } from "@/lib/i18n/es";
import { MIN_AGE } from "@/lib/safety/limits";
import { normalize } from "@/lib/safety/normalize";
import type { OnboardingStep, Personality, UserRow } from "@/lib/supabase/types";

export function parseAge(text: string): number | null {
  const m = text.match(/\b(\d{1,3})\b/);
  return m ? Number(m[1]) : null;
}

export function parseConsent(text: string): "yes" | "no" | null {
  const n = normalize(text).replace(/[^a-z\s]/g, "").trim();
  if (/\bno acepto\b/.test(n) || /^no\b/.test(n)) return "no";
  if (/\bacepto\b/.test(n) || /^(si|de acuerdo|ok|va|claro)$/.test(n)) return "yes";
  return null;
}

export function parsePersonality(text: string): Personality | null {
  const n = normalize(text).replace(/[^a-z0-9\s]/g, "").trim();
  if (/^1$|\bamigabl/.test(n)) return "amigable";
  if (/^2$|\bestrict/.test(n)) return "estricto";
  if (/^3$|\bbalancead/.test(n)) return "balanceado";
  return null;
}

export interface OnboardingResult {
  reply: string;
  update: Partial<Pick<UserRow, "onboarding_step" | "age" | "health_consent_at" | "consent_version" | "personality">>;
  /** Minors: erase anything they already sent. */
  purgeMessages?: boolean;
}

/** The question for the step the user is on (used when they send a photo/audio mid-onboarding). */
export function currentQuestion(step: OnboardingStep): string {
  if (step === "age") return t.askAgeAgain;
  if (step === "consent") return t.consentAskAgain;
  if (step === "personality") return t.personalityAskAgain;
  return "";
}

/**
 * Pure step function: given the user's step and their text, returns the reply and DB update.
 * Order is fixed in code: age → consent → personality → done.
 */
export function runOnboarding(step: OnboardingStep, text: string, now = new Date()): OnboardingResult {
  switch (step) {
    case "age": {
      const age = parseAge(text);
      if (age === null) return { reply: t.askAgeAgain, update: {} };
      if (age < 10 || age > 120) return { reply: t.ageOutOfRange, update: {} };
      if (age < MIN_AGE) return { reply: t.minorBlocked, update: { onboarding_step: "blocked_minor" }, purgeMessages: true };
      return { reply: t.consentRequest, update: { age, onboarding_step: "consent" } };
    }
    case "consent": {
      const answer = parseConsent(text);
      if (answer === "yes")
        return {
          reply: t.askPersonality,
          update: { health_consent_at: now.toISOString(), consent_version: CONSENT_VERSION, onboarding_step: "personality" },
        };
      if (answer === "no") return { reply: t.consentDeclined, update: {} };
      return { reply: t.consentAskAgain, update: {} };
    }
    case "personality": {
      const p = parsePersonality(text);
      if (!p) return { reply: t.personalityAskAgain, update: {} };
      return { reply: t.onboardingDone(personalityLabel[p]), update: { personality: p, onboarding_step: "done" } };
    }
    case "blocked_minor":
      return { reply: t.minorStillBlocked, update: {} };
    case "done":
      return { reply: "", update: {} };
  }
}
