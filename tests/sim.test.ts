import { describe, expect, it } from "vitest";
import { SIM_WA_ID, simulation } from "@/lib/sim/context";

describe("simulator safety", () => {
  it("accepts only fake 999… numbers", () => {
    expect(SIM_WA_ID.test("999000000101")).toBe(true);
    for (const real of ["5215512345678", "525512345678", "15551834282", "34612345678", "999", "999abc123456"]) expect(SIM_WA_ID.test(real)).toBe(false);
  });
  it("captures context only inside a simulation", async () => {
    expect(simulation.current()).toBeUndefined();
    const ctx = { outbox: [] as string[], images: new Map() };
    await simulation.run(ctx, async () => {
      expect(simulation.current()).toBe(ctx);
    });
    expect(simulation.current()).toBeUndefined();
  });
});
