import { mastery, studyOrder, type ReviewState } from "./srs";

export type PlanKind = "test" | "exam" | "homework";
export type Plan = { kind: PlanKind; due_date: string | null };

/** Cram when the due date is this many days away or fewer. */
export const CRAM_DAYS = 3;

export function daysLeft(due: string | null, now = new Date()) {
  if (!due) return null;
  const [y, m, d] = due.split("-").map(Number);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((Date.UTC(y!, m! - 1, d!) - today) / 86_400_000));
}

export type Pace =
  | { mode: "open" }
  | { mode: "cram"; days: number }
  | { mode: "spread"; days: number; newPerDay: number };

/**
 * Close deadline: cram the material you don't know yet, fast.
 * Far deadline: take new material in daily sets, leaving the last days for review.
 */
export function pace(due: string | null, newCount: number, now = new Date()): Pace {
  const days = daysLeft(due, now);
  if (days === null) return { mode: "open" };
  if (days <= CRAM_DAYS) return { mode: "cram", days };
  const learningDays = Math.max(1, days - 2);
  return { mode: "spread", days, newPerDay: Math.max(3, Math.ceil(newCount / learningDays)) };
}

/** Study order shaped by the student's deadline. */
export function pacedOrder<T extends { id: string; position: number }>(
  items: T[],
  states: Map<string, ReviewState>,
  spaced: boolean,
  p: Pace,
  now = new Date(),
) {
  const base = studyOrder(items, states, spaced, now);
  if (p.mode === "cram") {
    const known = (i: T) => mastery(states.get(i.id)) === "known";
    return [...base.filter((i) => !known(i)), ...base.filter(known)];
  }
  if (p.mode === "spread") {
    let n = 0;
    return base.filter((i) => states.has(i.id) || n++ < p.newPerDay);
  }
  return base;
}

export function paceLabel(p: Pace) {
  if (p.mode === "cram") return p.days === 0 ? "Due today · focus on what's not known yet" : `${p.days} day${p.days === 1 ? "" : "s"} left · focus on what's not known yet`;
  if (p.mode === "spread") return `${p.days} days left · ${p.newPerDay} new a day, plus review`;
  return "Add a due date to get a study plan";
}
