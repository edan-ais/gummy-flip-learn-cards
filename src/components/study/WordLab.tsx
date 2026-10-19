import { useState } from "react";
import { Check } from "lucide-react";
import { keyTerms, letterFeedback, patterns, syllables } from "@/lib/literacy";
import { ReadAloud } from "@/lib/read-aloud";

/** Dyslexia support: explicit syllables + sound/spelling patterns, guided spelling with instant feedback. */
export function WordLab({ text }: { text: string }) {
  const terms = keyTerms(text, 3);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState(false);
  const word = terms[i];
  if (!word) return null;
  const sy = syllables(word);
  const pats = patterns(word);
  const fb = letterFeedback(word, typed);
  const done = typed.toLowerCase() === word.toLowerCase();

  return (
    <div className="word-lab" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="eyebrow">Word lab · {i + 1}/{terms.length}</span>
        <ReadAloud text={sy.join(" - ") + ". " + word} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Syllables: ${sy.join(", ")}`}>
        {sy.map((p, k) => (
          <span key={k} className="syl" data-alt={k % 2 === 1}>
            {highlight(p, pats.map((x) => x.text))}
          </span>
        ))}
      </div>
      {pats.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {pats.map((p) => (
            <li key={p.text}>
              <b className="pattern-tag" data-kind={p.kind}>{p.text}</b> {p.sound}
            </li>
          ))}
        </ul>
      )}
      <label className="mt-3 block text-sm font-bold">Now spell it{hint ? "" : " from memory"}:</label>
      <div className="spell-feedback" aria-live="polite">
        {[...word].map((ch, k) => (
          <span key={k} data-state={k < typed.length ? (fb[k] ? "ok" : "bad") : hint ? "hint" : "empty"}>
            {k < typed.length ? typed[k] : hint ? ch : "_"}
          </span>
        ))}
      </div>
      <input
        className="gummy-input mt-2"
        value={typed}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={word.length}
        onChange={(e) => setTyped(e.target.value)}
        aria-label={`Spell ${word}`}
      />
      <div className="mt-2 flex gap-2">
        {done ? (
          <button
            className="gummy-btn flex-1"
            data-variant="success"
            onClick={() => {
              setI((i + 1) % terms.length);
              setTyped("");
              setHint(false);
            }}
          >
            <Check size={16} /> Got it! Next word
          </button>
        ) : (
          <button className="gummy-btn flex-1" data-variant="ghost" onClick={() => setHint(!hint)}>
            {hint ? "Hide letters" : "Show letters"}
          </button>
        )}
      </div>
    </div>
  );
}

function highlight(part: string, pats: string[]) {
  const p = pats.find((x) => part.toLowerCase().includes(x));
  if (!p) return part;
  const at = part.toLowerCase().indexOf(p);
  return (
    <>
      {part.slice(0, at)}
      <mark>{part.slice(at, at + p.length)}</mark>
      {part.slice(at + p.length)}
    </>
  );
}
