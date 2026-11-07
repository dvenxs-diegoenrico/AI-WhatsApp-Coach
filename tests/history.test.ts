import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ db: () => ({}), PHOTOS_BUCKET: "photos" }));
const { toTurns } = await import("@/lib/conversation/handle-message");

const rows = [
  { direction: "out" as const, body: "bienvenida" },
  { direction: "in" as const, body: "a" },
  { direction: "out" as const, body: "b" },
  { direction: "in" as const, body: "hola" },
  { direction: "in" as const, body: "una pregunta" },
  { direction: "in" as const, body: "¿qué ceno?" },
];

describe("toTurns", () => {
  it("chat: merges a burst of user messages into one question", () => {
    expect(toTurns(rows, "user")).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "hola\n\nuna pregunta\n\n¿qué ceno?" },
    ]);
  });

  it("photo: history ends with the assistant so the photo can follow", () => {
    expect(toTurns(rows, "assistant")).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
    ]);
  });

  it("chat: nothing pending when the last message is ours", () => {
    expect(toTurns(rows.slice(0, 3), "user")).toEqual([]);
  });
});
