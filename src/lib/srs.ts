/** Spaced repetition (SM-2 style). Struggling items come back sooner; known items become light review. */
export type Grade = "again" | "hard" | "good" | "easy";
export type ReviewState = {
  item_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
};

const MIN = 1 / (24 * 60);

export function schedule(prev: ReviewState | undefined, itemId: string, grade: Grade, now = new Date()): ReviewState {
  const s = prev ?? { item_id: itemId, ease: 2.5, interval_days: 0, reps: 0, lapses: 0, due_at: now.toISOString() };
  let { ease, interval_days, reps, lapses } = s;
  if (grade === "again") {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    interval_days = MIN;
  } else if (grade === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    interval_days = reps === 0 ? 10 * MIN : Math.max(1, interval_days * 1.2);
    reps += 1;
  } else if (grade === "good") {
    interval_days = reps === 0 ? 1 : reps === 1 ? 3 : interval_days * ease;
    reps += 1;
  } else {
    ease += 0.15;
    interval_days = reps === 0 ? 4 : interval_days * ease * 1.3;
    reps += 1;
  }
  const due = new Date(now.getTime() + interval_days * 86400000);
  return { item_id: itemId, ease, interval_days, reps, lapses, due_at: due.toISOString() };
}

/** How much a student is struggling with an item (higher = weaker). */
export function weakness(s: ReviewState | undefined, now = new Date()) {
  if (!s) return 1;
  const overdue = new Date(s.due_at) <= now ? 1 : 0;
  return (s.lapses + 1) / (s.reps + 1) + overdue + (2.5 - s.ease);
}

export type Mastery = "new" | "learning" | "known";
export function mastery(s: ReviewState | undefined): Mastery {
  if (!s) return "new";
  return s.reps >= 2 && s.interval_days >= 3 ? "known" : "learning";
}

/** Study order: due/struggling first, then new, then not-yet-due review. */
export function studyOrder<T extends { id: string; position: number }>(
  items: T[],
  states: Map<string, ReviewState>,
  enabled: boolean,
  now = new Date(),
) {
  if (!enabled) return [...items].sort((a, b) => a.position - b.position);
  const bucket = (i: T) => {
    const s = states.get(i.id);
    if (!s) return 1;
    return new Date(s.due_at) <= now ? 0 : 2;
  };
  return [...items].sort((a, b) => {
    const d = bucket(a) - bucket(b);
    if (d) return d;
    if (bucket(a) === 0) return weakness(states.get(b.id), now) - weakness(states.get(a.id), now);
    if (bucket(a) === 2) return +new Date(states.get(a.id)!.due_at) - +new Date(states.get(b.id)!.due_at);
    return a.position - b.position;
  });
}

/** Where a missed item re-enters the current session queue. */
export const REQUEUE_GAP = 3;
export function requeue<T>(queue: T[], index: number, grade: Grade) {
  if (grade !== "again" && grade !== "hard") return queue;
  const q = [...queue];
  const at = Math.min(q.length, index + 1 + (grade === "again" ? REQUEUE_GAP : REQUEUE_GAP * 2));
  q.splice(at, 0, queue[index]!);
  return q;
}

/** Pick sample-exam questions, weighted toward weak ones. */
export function pickExam<T extends { id: string }>(items: T[], states: Map<string, ReviewState>, n: number) {
  return [...items]
    .map((i) => ({ i, w: weakness(states.get(i.id)) + Math.random() }))
    .sort((a, b) => b.w - a.w)
    .slice(0, n)
    .map((x) => x.i);
}
