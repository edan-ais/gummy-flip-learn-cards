import { describe, expect, it } from "vitest";
import { GEM_PACKS, MIN_MARGIN, maxCostPerGem, netPerGem, processCost, GEM_COST } from "./gems";

describe("gem pricing", () => {
  it("every pack earns more per gem than the AI work it pays for", () => {
    for (const p of GEM_PACKS) expect(netPerGem(p)).toBeGreaterThanOrEqual(MIN_MARGIN * maxCostPerGem());
  });
  it("a short paste with no files costs 4 gems", () => {
    expect(processCost(5_000, 0)).toBe(4);
  });
  it("each PDF or photo to read adds a gem", () => {
    expect(processCost(5_000, 3)).toBe(7);
  });
  it("an Abstract episode costs 3 gems", () => {
    expect(GEM_COST.episode).toBe(3);
  });
});
