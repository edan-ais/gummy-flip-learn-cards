import { describe, it, expect } from "vitest";
import { memoryScore, nearbyKey, passes } from "@/lib/study";

describe("memorize rules", () => {
  it("passes only above 90%", () => {
    expect(passes(90)).toBe(false);
    expect(passes(90.1)).toBe(true);
  });
  it("counts neighboring keys as correct", () => {
    expect(nearbyKey("a", "s")).toBe(true);
    expect(nearbyKey("a", "p")).toBe(false);
  });
  it("scores first letters", () => {
    const s = memoryScore("Think body thinking people", "tbtp");
    expect(s.correct).toBe(4);
    expect(s.percent).toBe(100);
    expect(memoryScore("one two", "op").correct).toBe(1);
  });
});
