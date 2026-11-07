/** Lowercase and strip accents so "Embarazada", "embarazáda" and "EMBARAZADA" all match. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
