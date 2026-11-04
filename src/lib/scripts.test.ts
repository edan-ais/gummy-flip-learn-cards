import { describe, expect, it } from "vitest";
import { scriptPassages, scriptScore } from "./scripts";

describe("word-for-word scripts", () => {
  it("preserves every original word, punctuation and whitespace across passages", () => {
    const text = "  LAMB Y: Hello!\n\nI’m ready.  Are you?\n";
    expect(scriptPassages(text, 3).join("")).toBe(text);
    expect(scriptPassages(text, 3)).toHaveLength(3);
  });
  it("requires all full words, not first letters or neighboring keys", () => {
    expect(scriptScore("Keep the light on", "ktlo").complete).toBe(false);
    expect(scriptScore("Keep the light on", "Keep the light in").complete).toBe(false);
    expect(scriptScore("Keep the light on", "Keep the light on").complete).toBe(true);
  });
  it("rejects missing, added and reordered words even above 90 percent", () => {
    const text = "one two three four five six seven eight nine ten eleven";
    expect(scriptScore(text, "one two three four five six seven eight nine ten").complete).toBe(false);
    expect(scriptScore(text, text + " twelve").complete).toBe(false);
    expect(scriptScore("I am ready", "am I ready").complete).toBe(false);
  });
  it("ignores casing and punctuation without accepting paraphrases", () => {
    expect(scriptScore("I’m ready!", "i'm READY.").complete).toBe(true);
    expect(scriptScore("I’m ready!", "I am prepared").complete).toBe(false);
  });
});