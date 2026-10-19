export const MEMORY_ROUNDS = ["All words visible", "Some words hidden", "From memory"];

export function memoryWords(text: string) {
  return text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) || [];
}

/** Adjacent QWERTY keys, including diagonal neighbors, count as a one-key slip. */
export function nearbyKey(a: string, b: string) {
  if (a === b) return true;
  const rows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const offset = [0, 0.25, 0.5, 1];
  let pa: number[] | undefined, pb: number[] | undefined;
  rows.forEach((r, y) => {
    let x = r.indexOf(a);
    if (x >= 0) pa = [x + offset[y], y];
    x = r.indexOf(b);
    if (x >= 0) pb = [x + offset[y], y];
  });
  return !!pa && !!pb && Math.abs(pa[1] - pb[1]) <= 1 && Math.abs(pa[0] - pb[0]) <= 1.25;
}

export function memoryScore(answer: string, typed: string) {
  const expected = memoryWords(answer).map((w) => w[0].toLowerCase());
  const entered = typed.toLowerCase().match(/[a-z0-9]/g) || [];
  const correct = expected.reduce(
    (n, l, i) => n + (entered[i] !== undefined && nearbyKey(l, entered[i]) ? 1 : 0),
    0,
  );
  return {
    correct,
    total: expected.length,
    extra: Math.max(0, entered.length - expected.length),
    percent: (100 * correct) / Math.max(expected.length, entered.length, 1),
  };
}

/** A round passes only when accuracy is strictly above 90%. */
export const passes = (percent: number) => percent > 90;

const PREFIX = "psych-studio.v1.";
export function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
