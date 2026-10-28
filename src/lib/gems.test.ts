import { describe, expect, it } from "vitest";
import { GEM_PACKS, MIN_MARGIN, maxCostPerGem, aiBudgetPerGem, processCost, GEM_COST, FREE_BUDGET_USD_PER_STUDENT, welcomeWorstCaseUsd } from "./gems";

describe("BrainBucks pricing", () => {
  it("every pack covers 2x worst-case AI cost after payment fees and overhead", () => {
    for (const p of GEM_PACKS) expect(aiBudgetPerGem(p)).toBeGreaterThanOrEqual(MIN_MARGIN * maxCostPerGem());
  });
  it("free welcome BrainBucks stay within the per-student budget", () => {
    expect(welcomeWorstCaseUsd()).toBeLessThanOrEqual(FREE_BUDGET_USD_PER_STUDENT);
  });
  it("a short paste with no files costs 5", () => {
    expect(processCost(5_000, 0)).toBe(5);
  });
  it("each PDF or photo to read adds 2", () => {
    expect(processCost(5_000, 3)).toBe(11);
  });
  it("an Abstract episode costs 4", () => {
    expect(GEM_COST.episode).toBe(4);
  });
});
