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

/** Recall checks every full word in order; case, whitespace and surrounding punctuation are not graded. */
export function scriptScore(expected: string, typed: string) {
  const normalize = (word: string) => word.toLocaleLowerCase().replaceAll("’", "'");
  const words = scriptWords(expected);
  const entered = scriptWords(typed);
  const matches = words.map((word, i) => normalize(word) === normalize(entered[i] ?? ""));
  return { words, entered, matches, correct: matches.filter(Boolean).length,
    complete: words.length > 0 && words.length === entered.length && matches.every(Boolean) };
}

export function isScript(materials: { mime: string }[]) {
  return materials.some((m) => m.mime === SCRIPT_MIME);
}