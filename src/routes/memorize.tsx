import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Pencil, Keyboard, Sparkles } from "lucide-react";
import { Page, ChapterPills } from "@/components/study/Shell";
import { DrawLayer, type Stroke } from "@/components/study/DrawLayer";
import { CARDS, LABELS, MEMORY_ROUNDS, load, save, memoryScore, memoryWords, passes } from "@/lib/study";

export const Route = createFileRoute("/memorize")({
  head: () => ({
    meta: [
      { title: "Memorize · Psychology Study Studio" },
      { name: "description", content: "Memorize Exam 2 answers word by word with three first-letter rounds." },
      { property: "og:title", content: "Memorize · Psychology Study Studio" },
      { property: "og:description", content: "Type first letters over ghost words until you know every answer." },
    ],
  }),
  component: Memorize,
});

const WORD_RE = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*[^A-Za-z0-9\s]*/g;

function Memorize() {
  const [pos, setPos] = useState(0);
  const [stage, setStage] = useState(0);
  const [complete, setComplete] = useState(false);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [learned, setLearned] = useState<string[]>([]);
  const [draw, setDraw] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  const c = CARDS[pos];
  const words = c.a.match(WORD_RE) || [];
  const total = memoryWords(c.a).length;
  const entered = value.toLowerCase().match(/[a-z0-9]/g) || [];

  useEffect(() => setLearned(load("memory-learned", [])), []);
  useEffect(() => setStrokes(load(c.id, [])), [c.id]);

  const reset = (n: number) => {
    setPos(n);
    setStage(0);
    setComplete(false);
    setValue("");
    setFeedback("");
    setDraw(false);
  };

  const check = (typed: string) => {
    const s = memoryScore(c.a, typed);
    let fb = `${Math.round(s.percent * 10) / 10}% accuracy · ${s.correct} / ${s.total} words${s.extra ? ` · ${s.extra} extra letters` : ""}. `;
    if (passes(s.percent)) {
      if (stage < 2) {
        fb += `Passed. Try ${MEMORY_ROUNDS[stage + 1].toLowerCase()}.`;
        setStage(stage + 1);
      } else {
        setComplete(true);
        fb += "Memorized! You passed without answer text.";
        if (!learned.includes(c.id)) {
          const l = [...learned, c.id];
          setLearned(l);
          save("memory-learned", l);
        }
      }
    } else {
      setStage(0);
      fb += "Back to all words. Try again.";
    }
    setValue("");
    setFeedback(fb);
  };

  return (
    <Page eyebrow={`${CARDS.length} answers · ${learned.length} memorized`} title="Memorize">
      <p className="mb-4 text-sm text-muted-foreground">
        Tap the ghost words and type each first letter. Above 90% advances; 90% or below restarts. Neighboring keys
        count.
      </p>
      <div className="flex items-center gap-2">
        <button className="gummy-icon" disabled={pos === 0} onClick={() => reset(pos - 1)} aria-label="Previous">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <ChapterPills value={c.chapter} onChange={(ch) => reset(CARDS.findIndex((x) => x.chapter === ch))} />
        </div>
        <button
          className="gummy-icon"
          disabled={pos === CARDS.length - 1}
          onClick={() => reset(pos + 1)}
          aria-label="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-4 flex gap-1.5" aria-label={`Round ${stage + 1} of 3`}>
        {MEMORY_ROUNDS.map((r, i) => (
          <div key={r} className="round-dot" data-on={i <= stage || complete} />
        ))}
      </div>
      <p className="mt-2 text-sm font-bold text-primary">
        Round {stage + 1} / 3 · {MEMORY_ROUNDS[stage]}
      </p>

      <div
        className="gummy-card relative mt-3 animate-pop"
        key={c.id}
        data-drawing={draw}
        onClick={() => !draw && input.current?.focus({ preventScroll: true })}
      >
        <span className="eyebrow">
          {LABELS[c.chapter]} · {pos + 1} / {CARDS.length}
        </span>
        <h2 className="card-q text-lg">{c.q}</h2>
        <p className="memory-text">
          {words.map((w, i) => {
            const masked = stage === 2 || (stage === 1 && i % 2 === 1);
            const done = i < entered.length;
            return (
              <span
                key={i}
                className="memory-word"
                data-masked={masked}
                data-done={done}
                data-current={!complete && i === entered.length}
              >
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
            setValue(v);
            setFeedback("");
            if ((v.match(/[a-z0-9]/gi) || []).length >= total) check(v);
          }}
        />
        <DrawLayer strokes={strokes} active={draw} onCommit={(s) => (setStrokes(s), save(c.id, s))} />
      </div>

      <p className="caption mt-2">
        {entered.length} / {total} first letters · checks automatically
      </p>
      {feedback && (
        <div className="feedback animate-pop" role="status">
          {feedback}
        </div>
      )}
      {complete && (
        <div className="success-banner animate-pop">
          <Sparkles size={18} /> Memorized. Use Next for another answer, or Restart to practice again.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          className="gummy-btn"
          data-variant="ghost"
          onClick={() => {
            setStage(0);
            setComplete(false);
            setValue("");
            setFeedback("Restarted with all words visible.");
            input.current?.focus({ preventScroll: true });
          }}
        >
          <RotateCcw size={16} /> Restart
        </button>
        <button
          className="gummy-btn"
          data-variant={draw ? "primary" : "ghost"}
          onClick={() => {
            setDraw(!draw);
            if (draw) input.current?.focus({ preventScroll: true });
          }}
        >
          {draw ? <Keyboard size={16} /> : <Pencil size={16} />} {draw ? "Type" : "Draw"}
        </button>
      </div>
    </Page>
  );
}
