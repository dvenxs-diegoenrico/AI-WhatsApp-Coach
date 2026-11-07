import type { AudienceCode } from "@/lib/supabase/types";

/**
 * Reads the audience code from the first message: "Hola A", "Hola B", "Hola C", "Hola D".
 * - A message that is only "hola x" (any case) counts.
 * - With extra text after it, the letter must be uppercase ("Hola A, quiero info"),
 *   so "Hola a todos" is NOT read as audience A.
 */
export function parseAudienceCode(text: string): AudienceCode | null {
  const exact = text.trim().match(/^[¡!\s]*hola[\s,!.:-]+([abcd])[\s!.?]*$/i);
  if (exact) return exact[1].toUpperCase() as AudienceCode;
  const prefixed = text.trim().match(/^[¡!\s]*[Hh][Oo][Ll][Aa][\s,!.:-]+([ABCD])(?=$|[\s!.,?¿¡])/);
  return prefixed ? (prefixed[1] as AudienceCode) : null;
}
