/**
 * Works out the user's country from their WhatsApp number (country calling code),
 * so the coach can adapt foods, time zone and emergency resources.
 *
 * crisisLine / emergency are only filled in where we are confident of the number.
 * Everywhere else the coach tells the user to call their local emergency number.
 * Review these numbers before launch and add more countries as you verify them.
 */
export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string; // Spanish name
  timezone: string;
  crisisLine?: string; // suicide / emotional-crisis line, free text shown to the user
  emergency?: string; // general emergency number
}

const BY_PREFIX: Record<string, Country> = {
  "52": { code: "MX", name: "México", timezone: "America/Mexico_City", crisisLine: "Línea de la Vida: 800 911 2000 (gratis, 24 h)", emergency: "911" },
  "54": { code: "AR", name: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
  "56": { code: "CL", name: "Chile", timezone: "America/Santiago", crisisLine: "Línea de prevención del suicidio: *4141 (gratis, 24 h)", emergency: "131" },
  "57": { code: "CO", name: "Colombia", timezone: "America/Bogota", emergency: "123" },
  "51": { code: "PE", name: "Perú", timezone: "America/Lima" },
  "58": { code: "VE", name: "Venezuela", timezone: "America/Caracas" },
  "593": { code: "EC", name: "Ecuador", timezone: "America/Guayaquil", emergency: "911" },
  "591": { code: "BO", name: "Bolivia", timezone: "America/La_Paz" },
  "595": { code: "PY", name: "Paraguay", timezone: "America/Asuncion" },
  "598": { code: "UY", name: "Uruguay", timezone: "America/Montevideo", emergency: "911" },
  "502": { code: "GT", name: "Guatemala", timezone: "America/Guatemala" },
  "503": { code: "SV", name: "El Salvador", timezone: "America/El_Salvador", emergency: "911" },
  "504": { code: "HN", name: "Honduras", timezone: "America/Tegucigalpa" },
  "505": { code: "NI", name: "Nicaragua", timezone: "America/Managua" },
  "506": { code: "CR", name: "Costa Rica", timezone: "America/Costa_Rica", emergency: "911" },
  "507": { code: "PA", name: "Panamá", timezone: "America/Panama", emergency: "911" },
  "53": { code: "CU", name: "Cuba", timezone: "America/Havana" },
  "34": { code: "ES", name: "España", timezone: "Europe/Madrid", crisisLine: "Línea 024 de atención a la conducta suicida (gratis, 24 h)", emergency: "112" },
  "240": { code: "GQ", name: "Guinea Ecuatorial", timezone: "Africa/Malabo" },
  // +1 numbers: Puerto Rico and the Dominican Republic have their own area codes.
  "1787": { code: "PR", name: "Puerto Rico", timezone: "America/Puerto_Rico", crisisLine: "Línea 988 (marca 988 y elige español, 24 h)", emergency: "911" },
  "1939": { code: "PR", name: "Puerto Rico", timezone: "America/Puerto_Rico", crisisLine: "Línea 988 (marca 988 y elige español, 24 h)", emergency: "911" },
  "1809": { code: "DO", name: "República Dominicana", timezone: "America/Santo_Domingo", emergency: "911" },
  "1829": { code: "DO", name: "República Dominicana", timezone: "America/Santo_Domingo", emergency: "911" },
  "1849": { code: "DO", name: "República Dominicana", timezone: "America/Santo_Domingo", emergency: "911" },
  // Rest of +1: mostly the US. Time zone is a guess until the user tells us (reminders milestone).
  "1": { code: "US", name: "Estados Unidos", timezone: "America/New_York", crisisLine: "Línea 988 (marca 988 y elige español, 24 h)", emergency: "911" },
};

export const DEFAULT_TIMEZONE = "America/Mexico_City";

/** Longest matching calling-code prefix wins (e.g. 1787 Puerto Rico before 1 USA). */
export function countryFromWaId(waId: string): Country | null {
  for (let len = 4; len >= 1; len--) {
    const hit = BY_PREFIX[waId.slice(0, len)];
    if (hit) return hit;
  }
  return null;
}
