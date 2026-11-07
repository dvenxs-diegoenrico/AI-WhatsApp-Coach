import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ db: () => ({}), PHOTOS_BUCKET: "photos" }));
const { toTurns } = await import("@/lib/conversation/handle-message");

describe("toTurns", () => {
  it("merges same-role messages, starts with user and ends with assistant", () => {
    const turns = toTurns([
      { direction: "out", body: "bienvenida" },
      { direction: "in", body: "a" },
      { direction: "in", body: "b" },
      { direction: "out", body: "c" },
      { direction: "in", body: "pendiente" },
    ]);
    expect(turns).toEqual([
      { role: "user", content: "a\n\nb" },
      { role: "assistant", content: "c" },
    ]);
  });
});
