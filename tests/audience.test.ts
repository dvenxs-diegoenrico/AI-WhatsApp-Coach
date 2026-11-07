import { describe, expect, it } from "vitest";
import { parseAudienceCode } from "@/lib/conversation/audience";

describe("parseAudienceCode", () => {
  it.each([
    ["Hola A", "A"], ["Hola B", "B"], ["hola c", "C"], ["HOLA D", "D"], ["¡Hola A!", "A"],
    ["Hola, B", "B"], ["Hola A, quiero información", "A"], ["  Hola C  ", "C"],
  ])("%s → %s", (text, code) => expect(parseAudienceCode(text)).toBe(code));

  it.each(["Hola", "Hola a todos", "Hola E", "Buenas A", "Hola Ana", "hola buen día", "Hola Diego"])(
    "%s → null",
    (text) => expect(parseAudienceCode(text)).toBeNull(),
  );
});
