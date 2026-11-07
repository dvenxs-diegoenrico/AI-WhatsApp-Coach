import type { RiskFlag } from "@/lib/supabase/types";
import { normalize } from "./normalize";

/**
 * Detects signs that the user needs a professional, not an AI plan.
 * It's intentionally cautious: a match switches the user to "general guidance only"
 * mode (restricted_mode) permanently. Patterns run on accent-free lowercase text.
 */
const PATTERNS: Record<RiskFlag, RegExp[]> = {
  eating_disorder: [
    /\banorexi/, /\bbulimi/, /\btrastorno (de la )?(conducta )?alimentari/, /\btca\b/,
    /\batracon/, /\bme (provoco|provoque|hago) (el )?vomit/, /\bvomit\w* (despues de|lo que) com/,
    /\blaxante/, /\bpurgar(me)?\b/, /\bdejar de comer\b/, /\bno (he )?com(o|er|ido) (en|por) (\d+|varios|dos|tres) dias/,
    /\bme da (miedo|culpa) comer/, /\bme siento culpable (de|por) comer/, /\bodio mi cuerpo/,
  ],
  pregnancy: [/\bembarazad/, /\bencinta\b/, /\bgestacion\b/, /\bembarazo\b/, /\blactancia\b/, /\bamamant/, /\bestoy esperando (un )?beb/],
  diabetes: [/\bdiabet/, /\bprediabet/, /\binsulina\b/, /\bmetformina\b/, /\bglucosa alta\b/],
  kidney: [/\brinon(es)?\b/, /\brenal(es)?\b/, /\bdialisis\b/, /\bhemodialisis\b/, /\bnefropat/],
  heart: [
    /\bcardiac/, /\bcardiopat/, /\binfarto\b/, /\barritmia/, /\bmarcapasos\b/, /\bangina\b/,
    /\b(problemas?|enfermedad|soplo|falla) (del|de|en el) corazon\b/, /\binsuficiencia cardiaca/,
  ],
};

const CRISIS: RegExp[] = [
  /\bsuicid/, /\bquitarme la vida\b/, /\bmatarme\b/, /\bno quiero (seguir )?vivir\b/,
  /\bhacerme dano\b/, /\bme quiero morir\b/, /\bautolesi/, /\bcortarme\b/,
];

export interface ScreeningResult {
  flags: RiskFlag[];
  crisis: boolean;
}

export function screenMessage(text: string): ScreeningResult {
  const n = normalize(text);
  const flags = (Object.keys(PATTERNS) as RiskFlag[]).filter((flag) => PATTERNS[flag].some((re) => re.test(n)));
  const crisis = CRISIS.some((re) => re.test(n));
  return { flags, crisis };
}
