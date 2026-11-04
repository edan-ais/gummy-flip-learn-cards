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

/** Progress from full words to alternating initials, then every word's initial. */
export function scriptRecallScore(expected: string, typed: string, round: number) {
  const words = scriptWords(expected);
  const prompts = words.map((word, i) => round === 2 || (round === 1 && i % 2 === 1) ? Array.from(word)[0] ?? "" : word);
  const score = scriptScore(prompts.join(" "), typed);
  return { ...score, words, prompts };
}

/** Live on-card recall: full words, alternating initials, then contiguous initials. */
export function scriptRecallInput(expected: string, typed: string, round: number) {
  const words = scriptWords(expected);
  const prompts = words.map((word, i) => round === 2 || (round === 1 && i % 2 === 1) ? Array.from(word)[0] ?? "" : word);
  const entered = round === 2 ? Array.from(typed.replace(/[^\p{L}\p{N}]/gu, "")) : scriptWords(typed);
  const normalize = (word: string) => word.toLocaleLowerCase().replaceAll("’", "'");
  const matches = prompts.map((prompt, i) => normalize(prompt) === normalize(entered[i] ?? ""));
  const misses = prompts.map((prompt, i) => entered[i] !== undefined && !normalize(prompt).startsWith(normalize(entered[i] ?? "")));
  const finished = prompts.length > 0 && entered.length >= prompts.length && Array.from(entered[prompts.length - 1] ?? "").length >= Array.from(prompts[prompts.length - 1] ?? "").length;
  const current = matches.findIndex((match) => !match);
  return { words, entered, matches, misses, correct: matches.filter(Boolean).length, current: current < 0 ? words.length : current, finished,
    complete: words.length > 0 && words.length === entered.length && matches.every(Boolean) };
}