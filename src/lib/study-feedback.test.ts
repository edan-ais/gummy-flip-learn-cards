import { describe, it, expect, vi } from "vitest";
import { canAfford, isFundsError, shouldCelebrate, practiceAction, createAudioCache } from "./study-feedback";

describe("BrainBucks rules", () => {
  it("allows exactly three BrainBucks of grace, never four", () => {
    expect(canAfford(3, 0)).toBe(true);
    expect(canAfford(4, 0)).toBe(false);
  });
  it("recognizes both insufficient funds and the old wallet constraint", () => {
    expect(isFundsError(new Error("NOT_ENOUGH_GEMS"))).toBe(true);
    expect(isFundsError({ message: 'violates check constraint "gem_wallets_balance_check"' })).toBe(true);
    expect(isFundsError(new Error("Network unavailable"))).toBe(false);
  });
});
it("celebrates reaching 20 reviews once, not 19", () => {
  expect(shouldCelebrate(19, 20, false)).toBe(false);
  expect(shouldCelebrate(20, 20, false)).toBe(true);
  expect(shouldCelebrate(21, 20, true)).toBe(false);
});
it("treats known or newly successful practice questions as review", () => {
  expect(practiceAction(true)).toBe("Review");
  expect(practiceAction(false, "ok")).toBe("Review");
  expect(practiceAction(false, "miss")).toBe("Check answer");
});
it("coalesces simultaneous episode creation and replays without resolving again", async () => {
  const resolve = vi.fn(async () => ["saved-episode.wav"]);
  const cached = createAudioCache();
  await Promise.all([cached("episode", resolve), cached("episode", resolve)]);
  expect(await cached("episode", resolve)).toEqual(["saved-episode.wav"]);
  expect(resolve).toHaveBeenCalledTimes(1);
});
it("allows a failed audio request to retry", async () => {
  const cached = createAudioCache();
  await expect(cached("episode", async () => { throw new Error("not enough"); })).rejects.toThrow("not enough");
  expect(await cached("episode", async () => ["retry.wav"])).toEqual(["retry.wav"]);
});