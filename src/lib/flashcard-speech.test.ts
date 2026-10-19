import { describe, expect, it } from "vitest";
import { speechWords, wordAtOffset } from "./flashcard-speech";

describe("Flashcard spoken-word tracking", () => {
  it("highlights the word at each speech boundary, including punctuation and line breaks", () => {
    const text = "The cell,\n  makes energy.";
    expect(speechWords(text).map((word) => word.text)).toEqual(["The", "cell,", "makes", "energy."]);
    expect(wordAtOffset(text, 0)).toBe(0);
    expect(wordAtOffset(text, 4)).toBe(1);
    expect(wordAtOffset(text, 12)).toBe(2);
    expect(wordAtOffset(text, 18)).toBe(3);
  });
});