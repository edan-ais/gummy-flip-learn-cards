import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Pencil, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawLayer, type Stroke } from "./DrawLayer";
import { ReadAloud } from "@/lib/read-aloud";
import { type ExamBundle, useGrade } from "@/lib/exam-data";
import { pacedOrder } from "@/lib/pacing";
import { useSettings } from "@/lib/settings";
import { scriptRecallScore } from "@/lib/scripts";
import { load, save } from "@/lib/study";

const ROUNDS = ["All words visible", "Some words hidden", "From memory"];
const INPUT_LABELS = ["Type the exact script passage", "Type full visible words and the first letter of each hidden word", "Type the first letter of each script word"];
export function ScriptMemorize({ data }: { data: ExamBundle }) {
  const { s } = useSettings(); const grade = useGrade(data.exam.id);
  const [review, setReview] = useState(false);
  const order = useMemo(() => review ? pacedOrder(data.cards, data.states, s.spaced, data.pace) : [...data.cards].sort((a, b) => a.position - b.position), [review, data.cards, s.spaced]);
  const [pos, setPos] = useState(0); const [round, setRound] = useState(0);
  const [typed, setTyped] = useState(""); const [feedback, setFeedback] = useState(""); const [done, setDone] = useState(false);
  const [draw, setDraw] = useState(false); const [strokes, setStrokes] = useState<Stroke[]>([]);
  const card = order[pos];
  useEffect(() => { setStrokes(card ? load<Stroke[]>(card.id, []) : []); }, [card?.id]);
  const reset = (next: number) => { setPos(next); setRound(0); setTyped(""); setFeedback(""); setDone(false); setDraw(false); };
  if (!card) return <main className="page">No passages ready for review.</main>;
  const score = scriptRecallScore(card.a, typed, round);
  return <main className="page compact">
    <div className="seg" role="tablist"><Button role="tab" variant="ghost" aria-selected={!review} data-active={!review} onClick={() => { setReview(false); reset(0); }}>In script order</Button><Button role="tab" variant="ghost" aria-selected={review} data-active={review} onClick={() => { setReview(true); reset(0); }}>Review passages</Button></div>
    <div className="mt-4 flex items-center justify-between gap-2"><Button variant="ghost" size="icon" className="gummy-icon" aria-label="Previous passage" disabled={pos === 0} onClick={() => reset(pos - 1)}><ChevronLeft /></Button><span className="text-sm font-bold">{card.q} · {pos + 1}/{order.length}</span><ReadAloud text={card.a} /></div>
    <h1 className="mt-3 text-lg font-bold">Round {round + 1} / 3 · {ROUNDS[round]}</h1>
    <p className="caption mt-2">{round === 0 ? "Type every word in order." : round === 1 ? "Type visible words fully; use one first letter for each hidden word." : "Type each word’s first letter, in order."}</p>
    <div className="gummy-card relative mt-3" data-drawing={draw}>
      <p className="memory-text whitespace-pre-wrap">{(() => {
        let index = 0;
        return card.a.split(/([\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)/gu).map((piece, key) => {
          if (key % 2 === 0) return piece;
          const i = index++;
          const masked = round === 2 || (round === 1 && i % 2 === 1);
          const entered = i < score.entered.length;
          return <span key={key} className="memory-word" data-masked={masked} data-done={entered} data-miss={entered && !score.matches[i]} data-current={!done && i === score.entered.length}><span className={masked ? "memory-ghost" : "text-foreground"}>{piece}</span>{entered && <span className="memory-letter">{piece}</span>}</span>;
        });
      })()}</p>
      <DrawLayer strokes={strokes} active={draw} onCommit={(next) => { setStrokes(next); save(card.id, next); }} />
    </div>
    <form className="mt-4 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (score.complete) {
        if (round < 2) { setRound(round + 1); setTyped(""); setFeedback("Every word matched. Try with fewer letters."); }
        else { setDone(true); setFeedback("Every word matched in order. Passage recalled!"); void grade(card.id, "memorize", "good"); }
      } else {
        const first = score.matches.findIndex((matched) => !matched);
        setFeedback(first >= 0 ? `Not yet. Word ${first + 1} is “${score.words[first]}”. Try this passage again.` : "The original words matched, but there are extra words. Try again without the extras.");
        void grade(card.id, "memorize", "again");
      }
    }}>
      <label className="block font-bold">Your recall<textarea aria-label={INPUT_LABELS[round]} className="gummy-input mt-2 w-full resize-y" rows={round === 0 ? 5 : 3} value={typed} disabled={done} onChange={(e) => { setTyped(e.target.value); setFeedback(""); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
      <p className="caption">{score.correct} of {score.words.length} words matched in order</p>
      {feedback && <p className={done ? "success-banner" : "feedback"} role="status">{feedback}</p>}
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="gummy-btn" aria-label={draw ? "Switch to typing" : "Draw on passage"} title={draw ? "Switch to typing" : "Draw on passage"} aria-pressed={draw} onClick={() => setDraw(!draw)}>{draw ? <Keyboard size={18} /> : <Pencil size={18} />}</Button><Button type="submit" className="gummy-btn" disabled={done || !typed.trim()}>Check words</Button></div>
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="gummy-btn" aria-label="Restart passage" title="Restart passage" onClick={() => reset(pos)}><RotateCcw size={18} /></Button><Button type="button" variant="outline" className="gummy-btn" disabled={pos === order.length - 1} onClick={() => reset(pos + 1)}>Next <ChevronRight size={16} /></Button></div>
    </form>
  </main>;
}
