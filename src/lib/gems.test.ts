import { describe, expect, it } from "vitest";
import { filesCost, transcriptionCost, extraEpisodeCost, GEM_PACKS, MIN_MARGIN, maxCostPerGem, aiBudgetPerGem, processCost, GEM_COST, FREE_BUDGET_USD_PER_STUDENT, welcomeWorstCaseUsd } from "./gems";

describe("BrainBucks pricing", () => {
  it("every pack covers 2x worst-case AI cost after payment fees and overhead", () => {
    for (const p of GEM_PACKS) expect(aiBudgetPerGem(p)).toBeGreaterThanOrEqual(MIN_MARGIN * maxCostPerGem());
  });
  it("free welcome BrainBucks stay within the per-student budget", () => {
    expect(welcomeWorstCaseUsd()).toBeLessThanOrEqual(FREE_BUDGET_USD_PER_STUDENT);
  });
  it("a short paste with no files costs 6", () => {
    expect(processCost(5_000)).toBe(6);
  });
  it("each PDF or photo up to 5 MB adds 2", () => {
    expect(processCost(5_000, [1e6, 2e6, 3e6])).toBe(12);
  });
  it("a 12 MB PDF costs three reading steps", () => {
    expect(filesCost([12 * 1024 * 1024])).toBe(6);
  });
  it("longer notes cost more: 90k characters is 3 parse steps", () => {
    expect(processCost(90_000)).toBe(2 + 12);
  });
  it("a 6-minute spoken note costs 3", () => {
    expect(transcriptionCost(16_000_000)).toBe(3);
  });
  it("episodes past 5 clips cost 1 per extra clip", () => {
    expect(extraEpisodeCost(5)).toBe(0);
    expect(extraEpisodeCost(8)).toBe(3);
  });
  it("an Abstract episode costs 4", () => {
    expect(GEM_COST.episode).toBe(4);
  });
});
