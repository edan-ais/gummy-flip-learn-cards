import { describe, expect, it } from "vitest";
import { scriptPassages, scriptScore, scriptRecallScore, scriptRecallInput } from "./scripts";

describe("word-for-word scripts", () => {
  it("checks on-card full words without penalizing a partially typed word", () => {
    expect(scriptRecallInput("Keep the light on", "Keep th", 0).misses).toEqual([false, false, false, false]);
    expect(scriptRecallInput("Keep the light on", "Keep r", 0).misses[1]).toBe(true);
    expect(scriptRecallInput("Keep the light on", "Keep the light on", 0).complete).toBe(true);
    expect(scriptRecallInput("Keep the light on", "Keep the light in", 0).complete).toBe(false);
  });
  it("automatically finishes reduced on-card recall with strict ordered initials", () => {
    expect(scriptRecallInput("Keep the light on", "Keep t light o", 1).complete).toBe(true);
    expect(scriptRecallInput("Keep the light on", "ktlo", 2).complete).toBe(true);
    expect(scriptRecallInput("Keep the light on", "krlo", 2).complete).toBe(false);
    expect(scriptRecallInput("Keep the light on", "ktl", 2).finished).toBe(false);
    expect(scriptRecallInput("Keep the light on", "ktlox", 2).complete).toBe(false);
  });
  it("starts with exact full words", () => {
    expect(scriptRecallScore("Keep the light on", "Keep the light on", 0).complete).toBe(true);
    expect(scriptRecallScore("Keep the light on", "K t l o", 0).complete).toBe(false);
  });
  it("reduces alternating words to initials in the second round", () => {
    expect(scriptRecallScore("Keep the light on", "Keep t light o", 1).complete).toBe(true);
    expect(scriptRecallScore("Keep the light on", "Keep r light o", 1).complete).toBe(false);
  });
  it("requires exact initials in original order in the final round", () => {
    expect(scriptRecallScore("Keep the light on", "K t l o", 2).complete).toBe(true);
    expect(scriptRecallScore("Keep the light on", "K r l o", 2).complete).toBe(false);
    expect(scriptRecallScore("Keep the light on", "K l t o", 2).complete).toBe(false);
    expect(scriptRecallScore("Keep the light on", "K t l o x", 2).complete).toBe(false);
  });
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