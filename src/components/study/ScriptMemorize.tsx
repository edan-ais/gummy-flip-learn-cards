import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadAloud } from "@/lib/read-aloud";
import { type ExamBundle, useGrade } from "@/lib/exam-data";
import { pacedOrder } from "@/lib/pacing";
import { useSettings } from "@/lib/settings";
import { scriptScore } from "@/lib/scripts";

const ROUNDS = ["All words visible", "Some words hidden", "From memory"];
export function ScriptMemorize({ data }: { data: ExamBundle }) {
  const { s } = useSettings(); const grade = useGrade(data.exam.id);
  const [review, setReview] = useState(false);
  const order = useMemo(() => review ? pacedOrder(data.cards, data.states, s.spaced, data.pace) : [...data.cards].sort((a, b) => a.position - b.position), [review, data.cards, s.spaced]);
  const [pos, setPos] = useState(0); const [round, setRound] = useState(0);
  const [typed, setTyped] = useState(""); const [feedback, setFeedback] = useState(""); const [done, setDone] = useState(false);
  const card = order[pos];
  const reset = (next: number) => { setPos(next); setRound(0); setTyped(""); setFeedback(""); setDone(false); };
  if (!card) return <main className="page">No passages ready for review.</main>;
  const score = scriptScore(card.a, typed);
  return <main className="page compact">
    <div className="seg" role="tablist"><Button role="tab" variant="ghost" aria-selected={!review} data-active={!review} onClick={() => { setReview(false); reset(0); }}>In script order</Button><Button role="tab" variant="ghost" aria-selected={review} data-active={review} onClick={() => { setReview(true); reset(0); }}>Review passages</Button></div>
    <div className="mt-4 flex items-center justify-between gap-2"><Button variant="ghost" size="icon" className="gummy-icon" aria-label="Previous passage" disabled={pos === 0} onClick={() => reset(pos - 1)}><ChevronLeft /></Button><span className="text-sm font-bold">{card.q} · {pos + 1}/{order.length}</span><ReadAloud text={card.a} /></div>
    <h1 className="mt-3 text-lg font-bold">Round {round + 1} / 3 · {ROUNDS[round]}</h1>
    <p className="caption mt-2">Type every word in order. Spelling counts; capitals and punctuation don’t.</p>
    <div className="gummy-card mt-3">
      {round < 2 ? <p className="memory-text whitespace-pre-wrap">{card.a.split(/(\s+)/u).map((word, i) => /^\s+$/.test(word) ? word : <span key={i} className="memory-word" data-masked={round === 1 && i % 4 === 2}><span className="memory-ghost">{word}</span></span>)}</p> : <p className="font-bold text-muted-foreground">{score.words.length} words · from memory</p>}
    </div>
    <form className="mt-4 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (score.complete) {
        if (round < 2) { setRound(round + 1); setTyped(""); setFeedback("Every word matched. Try with fewer words showing."); }
        else { setDone(true); setFeedback("Every word matched in order. Passage recalled!"); void grade(card.id, "memorize", "good"); }
      } else {
        const first = score.matches.findIndex((matched) => !matched);
        setFeedback(first >= 0 ? `Not yet. Word ${first + 1} is “${score.words[first]}”. Try this passage again.` : "The original words matched, but there are extra words. Try again without the extras.");
        void grade(card.id, "memorize", "again");
      }
    }}>
      <label className="block font-bold">Your recall<textarea aria-label="Type the exact script passage" className="gummy-input mt-2 w-full resize-y" rows={5} value={typed} disabled={done} onChange={(e) => { setTyped(e.target.value); setFeedback(""); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
      <p className="caption">{score.correct} of {score.words.length} words matched in order</p>
      {feedback && <p className={done ? "success-banner" : "feedback"} role="status">{feedback}</p>}
      <div className="grid grid-cols-3 gap-2"><Button type="button" variant="outline" className="gummy-btn" aria-label="Restart passage" title="Restart passage" onClick={() => reset(pos)}><RotateCcw size={18} /></Button><Button type="submit" className="gummy-btn" disabled={done || !typed.trim()}>Check words</Button><Button type="button" variant="outline" className="gummy-btn" disabled={pos === order.length - 1} onClick={() => reset(pos + 1)}>Next <ChevronRight size={16} /></Button></div>
    </form>
  </main>;
}