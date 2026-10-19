/** Structured-literacy helpers: syllables and explicit spelling/sound patterns. */

export type Pattern = { text: string; sound: string; kind: "prefix" | "suffix" | "team" | "digraph" };

const PREFIXES: [string, string][] = [
  ["trans", "across"], ["inter", "between"], ["under", "below"], ["over", "too much / above"],
  ["pre", "before"], ["dis", "not / apart"], ["mis", "wrongly"], ["sub", "under"], ["un", "not"], ["re", "again"],
];
const SUFFIXES: [string, string][] = [
  ["tion", "/shun/"], ["sion", "/zhun/ or /shun/"], ["ture", "/cher/"], ["ment", "/ment/"], ["ness", "/ness/"],
  ["ous", "/us/"], ["ible", "/uh-bul/"], ["able", "/uh-bul/"], ["ance", "/ance/"], ["ence", "/ence/"],
  ["ity", "/ih-tee/"], ["ive", "/iv/"], ["ism", "/iz-um/"], ["ist", "/ist/"], ["ing", "/ing/"], ["ed", "/d/, /t/ or /id/"], ["ly", "/lee/"], ["al", "/ul/"],
];
const TEAMS: [string, string][] = [
  ["igh", "long i /ī/"], ["ee", "long e /ē/"], ["ea", "long e /ē/"], ["oa", "long o /ō/"], ["ai", "long a /ā/"],
  ["ay", "long a /ā/"], ["ou", "/ow/"], ["ow", "/ow/ or /ō/"], ["oi", "/oy/"], ["oy", "/oy/"], ["au", "/aw/"],
  ["aw", "/aw/"], ["oo", "/oo/"], ["ie", "/ī/ or /ē/"],
];
const DIGRAPHS: [string, string][] = [
  ["ph", "/f/"], ["ch", "/ch/ or /k/"], ["sh", "/sh/"], ["th", "/th/"], ["wh", "/w/"], ["ck", "/k/"], ["gh", "silent or /f/"], ["kn", "/n/"], ["wr", "/r/"], ["ps", "/s/ at the start"],
];

export function patterns(word: string): Pattern[] {
  const w = word.toLowerCase();
  const out: Pattern[] = [];
  for (const [p, m] of PREFIXES) if (w.startsWith(p) && w.length > p.length + 3) { out.push({ text: p, sound: `prefix: ${m}`, kind: "prefix" }); break; }
  for (const [s, m] of SUFFIXES) if (w.endsWith(s) && w.length > s.length + 2) { out.push({ text: s, sound: `says ${m}`, kind: "suffix" }); break; }
  for (const [t, m] of [...TEAMS, ...DIGRAPHS]) if (w.includes(t) && !out.some((o) => o.text.includes(t))) {
    out.push({ text: t, sound: `says ${m}`, kind: TEAMS.some(([x]) => x === t) ? "team" : "digraph" });
  }
  return out.slice(0, 4);
}

/** Heuristic syllable split (vowel groups, consonant split between). */
export function syllables(word: string): string[] {
  const w = word.replace(/[^A-Za-z'-]/g, "");
  if (w.length <= 3) return [w];
  const parts = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
  if (!parts || parts.join("") !== w) return [w];
  // Merge trailing silent "e" syllable (e.g. "ture" stays, "ate" -> one)
  const last = parts[parts.length - 1]!;
  if (parts.length > 1 && /^[^aeiouy]*e$/i.test(last) && !/le$/i.test(last)) {
    parts[parts.length - 2] += last;
    parts.pop();
  }
  return parts;
}

const STOP = new Set("because between through without another however different something important example usually".split(" "));

/** Pick key terms worth spelling practice from a text. */
export function keyTerms(text: string, n = 3) {
  const words = text.match(/[A-Za-z][A-Za-z'-]{6,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words.sort((a, b) => b.length - a.length)) {
    const k = w.toLowerCase();
    if (seen.has(k) || STOP.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

/** Instant per-letter feedback for spelling practice. */
export function letterFeedback(target: string, typed: string) {
  return [...typed].map((ch, i) => ch.toLowerCase() === (target[i] ?? "").toLowerCase());
}

/** Split an answer into short, ADHD-friendly chunks. */
export function chunks(text: string, maxWords = 22) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  for (const s of sentences) {
    const n = cur.join(" ").split(/\s+/).length + s.split(/\s+/).length;
    if (cur.length && n > maxWords) {
      out.push(cur.join(" "));
      cur = [];
    }
    cur.push(s);
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}
