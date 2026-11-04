export const SCRIPT_MIME = "text/x-studylamb-script";
export const SCRIPT_SOURCE = "script:verbatim";

/** Split only at whitespace boundaries; concatenation reproduces the source byte-for-byte. */
export function scriptPassages(text: string, wordsPerPassage = 60) {
  const words = Array.from(text.matchAll(/\S+/gu));
  const passages: string[] = [];
  let start = 0;
  for (let i = wordsPerPassage; i < words.length; i += wordsPerPassage) {
    const end = words[i]?.index;
    if (end === undefined) continue;
    passages.push(text.slice(start, end));
    start = end;
  }
  if (text.slice(start).trim()) passages.push(text.slice(start));
  return passages;
}

export function scriptWords(text: string) {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

export function isScript(materials: { mime: string }[]) {
  return materials.some((m) => m.mime === SCRIPT_MIME);
}

/**
 * Live on-card recall for scripts: one typed letter per word, checked strictly
 * against that word's first letter, in order. Word-for-word fidelity comes from
 * requiring every word's initial — no skips, no extras, no reordering.
 */
export function scriptRecallInput(expected: string, typed: string) {
  const words = scriptWords(expected);
  const normalize = (word: string) => word.toLocaleLowerCase().replaceAll("’", "'");
  const firsts = words.map((word) => normalize(Array.from(word)[0] ?? ""));
  const entered = Array.from(typed.replace(/[^\p{L}\p{N}]/gu, "")).map(normalize);
  const matches = firsts.map((first, i) => first === (entered[i] ?? ""));
  const misses = firsts.map((first, i) => entered[i] !== undefined && entered[i] !== first);
  const finished = firsts.length > 0 && entered.length >= firsts.length;
  const current = matches.findIndex((match) => !match);
  return {
    words,
    entered,
    matches,
    misses,
    correct: matches.filter(Boolean).length,
    current: current < 0 ? words.length : current,
    finished,
    complete: firsts.length > 0 && entered.length === firsts.length && matches.every(Boolean),
  };
}
