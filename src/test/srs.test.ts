import { describe, it, expect } from "vitest";
import { schedule, studyOrder, requeue, mastery, type ReviewState } from "@/lib/srs";
import { syllables, patterns, letterFeedback, chunks } from "@/lib/literacy";

const now = new Date("2026-01-01T00:00:00Z");

describe("spaced repetition", () => {
  it("a missed item comes back within the session", () => {
    const s = schedule(undefined, "a", "again", now);
    expect(new Date(s.due_at).getTime() - now.getTime()).toBeLessThan(5 * 60000);
    expect(s.lapses).toBe(1);
  });
  it("known items move further out (review)", () => {
    let s = schedule(undefined, "a", "good", now);
    expect(s.interval_days).toBe(1);
    s = schedule(s, "a", "good", now);
    expect(s.interval_days).toBe(3);
    expect(mastery(s)).toBe("known");
  });
  it("due struggling items come before new, new before not-due", () => {
    const states = new Map<string, ReviewState>([
      ["due", { item_id: "due", ease: 1.5, interval_days: 0, reps: 0, lapses: 3, due_at: "2025-12-31T00:00:00Z" }],
      ["later", { item_id: "later", ease: 2.6, interval_days: 9, reps: 4, lapses: 0, due_at: "2026-02-01T00:00:00Z" }],
    ]);
    const items = [{ id: "later", position: 0 }, { id: "new", position: 1 }, { id: "due", position: 2 }];
    expect(studyOrder(items, states, true, now).map((i) => i.id)).toEqual(["due", "new", "later"]);
    expect(studyOrder(items, states, false, now).map((i) => i.id)).toEqual(["later", "new", "due"]);
  });
  it("a missed card re-enters the queue 3 cards later", () => {
    expect(requeue(["a", "b", "c", "d", "e"], 0, "again")).toEqual(["a", "b", "c", "d", "a", "e"]);
    expect(requeue(["a", "b"], 0, "good")).toEqual(["a", "b"]);
  });
});

describe("literacy", () => {
  it("splits syllables and finds spelling patterns", () => {
    expect(syllables("development").join("")).toBe("development");
    expect(syllables("development").length).toBeGreaterThan(2);
    expect(patterns("observation").some((p) => p.text === "tion")).toBe(true);
  });
  it("gives per-letter feedback", () => {
    expect(letterFeedback("schema", "scxe")).toEqual([true, true, false, true]);
  });
  it("chunks long answers", () => {
    expect(chunks("One two three. Four five six.", 3)).toEqual(["One two three.", "Four five six."]);
  });
});
