import { describe, expect, it } from "vitest";
import { pace, pacedOrder } from "./pacing";

const now = new Date("2026-10-19T12:00:00");
const items = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, position: i }));

describe("deadline pacing", () => {
  it("3 days out is cram mode", () => {
    expect(pace("2026-10-22", 30, now).mode).toBe("cram");
  });
  it("12 days out spreads 30 new cards into sets of 3 a day", () => {
    expect(pace("2026-10-31", 30, now)).toEqual({ mode: "spread", days: 12, newPerDay: 3 });
  });
  it("spread mode only shows today's set of new cards", () => {
    expect(pacedOrder(items, new Map(), true, pace("2026-10-31", 30, now), now)).toHaveLength(3);
  });
  it("cram mode keeps every card", () => {
    expect(pacedOrder(items, new Map(), true, pace("2026-10-20", 30, now), now)).toHaveLength(30);
  });
});
