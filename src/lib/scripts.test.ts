import { describe, expect, it } from "vitest";
import { scriptPassages, scriptRecallInput } from "./scripts";

describe("word-for-word scripts", () => {
  it("checks one typed letter per word, in order", () => {
    expect(scriptRecallInput("Keep the light on", "ktlo").complete).toBe(true);
    expect(scriptRecallInput("Keep the light on", "k t l o").complete).toBe(true);
    expect(scriptRecallInput("Keep the light on", "krlo").complete).toBe(false);
    expect(scriptRecallInput("Keep the light on", "ktl").finished).toBe(false);
    expect(scriptRecallInput("Keep the light on", "ktlox").complete).toBe(false);
  });
  it("flags the exact word whose initial is wrong, right when it is typed", () => {
    const recall = scriptRecallInput("Keep the light on", "kr");
    expect(recall.misses).toEqual([false, true, false, false]);
    expect(recall.current).toBe(1);
    expect(recall.words[1]).toBe("the");
  });
  it("requires every word's initial — no skips, extras or reordering", () => {
    expect(scriptRecallInput("I am ready", "iar").complete).toBe(true);
    expect(scriptRecallInput("I am ready", "air").complete).toBe(false);
    expect(scriptRecallInput("I am ready", "ia").complete).toBe(false);
    expect(scriptRecallInput("I am ready", "iars").complete).toBe(false);
  });
  it("ignores casing and apostrophe style", () => {
    expect(scriptRecallInput("I’m Ready!", "IR").complete).toBe(true);
  });
  it("preserves every original word, punctuation and whitespace across passages", () => {
    const text = "  LAMB Y: Hello!\n\nI’m ready.  Are you?\n";
    expect(scriptPassages(text, 3).join("")).toBe(text);
    expect(scriptPassages(text, 3)).toHaveLength(3);
  });
});
