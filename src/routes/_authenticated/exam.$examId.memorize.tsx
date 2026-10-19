import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Pencil, Keyboard, Sparkles } from "lucide-react";
import { SectionPills } from "@/components/study/Shell";
import { DrawLayer, type Stroke } from "@/components/study/DrawLayer";
import { examQuery, useGrade } from "@/lib/exam-data";
import { useSettings } from "@/lib/settings";
import { pacedOrder } from "@/lib/pacing";
import { ReadAloud } from "@/lib/read-aloud";
import { chunks, syllables } from "@/lib/literacy";
import { MEMORY_ROUNDS, load, save, memoryScore, memoryWords, nearbyKey, passes } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/exam/$examId/memorize")({
  component: Memorize,
});

const WORD_RE = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*[^A-Za-z0-9\s]*/g;

function Memorize() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { s } = useSettings();
  const grade = useGrade(examId);
  const [section, setSection] = useState<string | null>(null);
  const order = useMemo(
    () => pacedOrder(data.cards.filter((c) => !section || c.section_id === section), data.states, s.spaced, data.pace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, s.spaced],
  );
  const [pos, setPos] = useState(0);
  const [part, setPart] = useState(0);
  const [stage, setStage] = useState(0);
  const [complete, setComplete] = useState(false);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [draw, setDraw] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  const c = order[pos];
  const parts = c ? (s.adhd ? chunks(c.a, 18) : [c.a]) : [];
  const text = parts[part] ?? "";
  const words = text.match(WORD_RE) || [];
  const total = memoryWords(text).length;
  const entered = value.toLowerCase().match(/[a-z0-9]/g) || [];
  const firsts = memoryWords(text).map((w) => w[0].toLowerCase());
  const missAt = (i: number) => entered[i] !== undefined && !nearbyKey(firsts[i] ?? "", entered[i]);
  const [slip, setSlip] = useState<{ typed: string; word: string; n: number } | null>(null);

  useEffect(() => {
    if (c) setStrokes(load(c.id, []));
  }, [c?.id]);
  useEffect(() => reset(0), [order]);

  function reset(n: number) {
    setPos(n);
    setPart(0);
    setStage(0);
    setComplete(false);
    setValue("");
    setFeedback("");
    setSlip(null);
    setDraw(false);
  }

  const check = (typed: string) => {
    if (!c) return;
    const sc = memoryScore(text, typed);
    let fb = `${sc.correct} of ${sc.total} words matched. `;
    if (passes(sc.percent)) {
      if (stage < 2) {
        fb += `Your recall worked. Next: ${MEMORY_ROUNDS[stage + 1]!.toLowerCase()}.`;
        setStage(stage + 1);
      } else if (part < parts.length - 1) {
        fb += "That chunk stuck. Next: the following piece.";
        setPart(part + 1);
        setStage(0);
      } else {
        setComplete(true);
        fb += "You recalled it with no words showing.";
        grade(c.id, "memorize", "good");
      }
    } else {
      if (stage > 0) grade(c.id, "memorize", "again");
      setStage(0);
      fb += "Not yet. Read the red words once, then type it again with all words showing.";
    }
    setValue("");
    setSlip(null);
    setFeedback(fb);
  };

  if (!c) return <main className="page"><p className="text-muted-foreground">No cards in this section.</p></main>;
  const currentWord = words[entered.length]?.replace(/[^A-Za-z']/g, "");
  const showCurrent = s.dyslexia && currentWord && !(stage === 2 || (stage === 1 && entered.length % 2 === 1));

  return (
    <main className="page compact">
      <SectionPills sections={data.sections} value={section} onChange={setSection} />
      <div className="mt-3 flex items-center gap-2">
        <button className="gummy-icon sm" disabled={pos === 0} onClick={() => reset(pos - 1)} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Round ${stage + 1} of 3`}>
          {MEMORY_ROUNDS.map((r, i) => (
            <div key={r} className="round-dot" data-on={i <= stage || complete} />
          ))}
        </div>
        <button className="gummy-icon sm" disabled={pos === order.length - 1} onClick={() => reset(pos + 1)} aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="mt-2 text-sm font-bold text-primary">
        Round {stage + 1} / 3 · {MEMORY_ROUNDS[stage]}
        {parts.length > 1 && ` · Chunk ${part + 1}/${parts.length}`}
      </p>

      <div
        className="gummy-card relative mt-3 animate-pop"
        key={c.id + part}
        data-drawing={draw}
        onClick={() => !draw && input.current?.focus({ preventScroll: true })}
      >
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            {pos + 1} / {order.length}
          </span>
          <ReadAloud text={text} />
        </div>
        <h2 className="card-q text-lg">{c.q}</h2>
        <p className="memory-text">
          {words.map((w, i) => {
            const masked = stage === 2 || (stage === 1 && i % 2 === 1);
            const done = i < entered.length;
            const miss = done && missAt(i);
            return (
              <span key={i} className="memory-word" data-masked={masked} data-done={done} data-miss={miss} data-current={!complete && i === entered.length}>
                <span className="memory-ghost">{w}</span>
                {done && <span className="memory-letter">{w}</span>}
              </span>
            );
          })}
        </p>
        <textarea
          ref={input}
          className="memory-input"
          rows={2}
          value={value}
          disabled={complete}
          aria-label="Type the first letter of each word"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            const next = v.toLowerCase().match(/[a-z0-9]/g) || [];
            const i = next.length - 1;
            if (next.length > entered.length && i >= 0 && i < firsts.length && !nearbyKey(firsts[i]!, next[i]!)) {
              setSlip({ typed: next[i]!, word: memoryWords(text)[i]!, n: Date.now() });
              navigator.vibrate?.(40);
            } else if (next.length > entered.length) setSlip(null);
            setValue(v);
            setFeedback("");
            if ((v.match(/[a-z0-9]/gi) || []).length >= total) check(v);
          }}
        />
        <DrawLayer strokes={strokes} active={draw} onCommit={(x) => (setStrokes(x), save(c.id, x))} />
      </div>

      {slip && (
        <div className="slip-row" key={slip.n} role="status" aria-live="assertive">
          <span className="slip-key" aria-label={`You typed ${slip.typed}`}>{slip.typed.toUpperCase()}</span>
          <span>Not yet. That word is <b className="slip-word">{slip.word}</b>. Keep going.</span>
        </div>
      )}
      {showCurrent && (
        <div className="mt-2 flex items-center gap-2 text-sm" aria-live="polite">
          <span className="font-bold text-muted-foreground">Next word:</span>
          {syllables(currentWord!).map((p, k) => (
            <span key={k} className="syl" data-alt={k % 2 === 1}>
              {k === 0 ? <><mark>{p[0]}</mark>{p.slice(1)}</> : p}
            </span>
          ))}
        </div>
      )}
      <p className="caption mt-2">
        {entered.length} of {total} first letters typed
      </p>
      {feedback && (
        <div className="feedback animate-pop" role="status">
          {feedback}
        </div>
      )}
      {complete && (
        <div className="success-banner animate-pop">
          <Sparkles size={18} /> All three rounds done. Tap Next for another card.
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          className="gummy-btn"
          data-variant="ghost"
          onClick={() => {
            setStage(0);
            setPart(0);
            setComplete(false);
            setValue("");
            setFeedback("Restarted with all words visible.");
          }}
        >
          <RotateCcw size={16} />
        </button>
        <button className="gummy-btn" data-variant={draw ? "primary" : "ghost"} onClick={() => setDraw(!draw)}>
          {draw ? <Keyboard size={16} /> : <Pencil size={16} />}
        </button>
        <button className="gummy-btn" data-variant="primary" disabled={pos === order.length - 1} onClick={() => reset(pos + 1)}>
          Next
        </button>
      </div>
    </main>
  );
}
