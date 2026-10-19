import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Shuffle, Check, Pencil, Eraser } from "lucide-react";
import { Page, ChapterPills } from "@/components/study/Shell";
import { DrawLayer, type Stroke } from "@/components/study/DrawLayer";
import { CARDS, LABELS, load, save } from "@/lib/study";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flashcards · Psychology Study Studio" },
      { name: "description", content: "Flip, draw on, and mark 215 Exam 2 psychology flashcards for Ch 4, 6 and 7." },
      { property: "og:title", content: "Flashcards · Psychology Study Studio" },
      { property: "og:description", content: "Recall it. Draw it. Hear it. Exam 2 flashcards on your phone." },
    ],
  }),
  component: Cards,
});

function Cards() {
  const [order, setOrder] = useState(() => CARDS.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draw, setDraw] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [dir, setDir] = useState(0);
  const c = CARDS[order[pos]!]!;
  const touch = useRef<number | null>(null);

  useEffect(() => setKnown(load("known", [])), []);
  useEffect(() => setStrokes(load(c.id, [])), [c.id]);

  const go = (n: number) => {
    if (n < 0 || n >= order.length) return;
    setDir(n > pos ? 1 : -1);
    setPos(n);
    setFlipped(false);
    setDraw(false);
  };
  const isKnown = known.includes(c.id);

  return (
    <Page eyebrow="Exam 2 · Ch 4, 6, 7" title="Study stack">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {CARDS.length} cards · <b className="text-foreground">{known.length}</b> learned
        </span>
        <button
          className="gummy-chip"
          onClick={() => {
            const o = [...order];
            for (let i = o.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [o[i], o[j]] = [o[j], o[i]];
            }
            setOrder(o);
            go(0);
            setPos(0);
          }}
        >
          <Shuffle size={15} /> Shuffle
        </button>
      </div>
      <ChapterPills
        value={c.chapter}
        onChange={(ch) => {
          setOrder(CARDS.map((_, i) => i));
          setPos(CARDS.findIndex((x) => x.chapter === ch));
          setFlipped(false);
          setDraw(false);
        }}
      />
      <div className="mt-4 mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">{LABELS[c.chapter]}</span>
        <span className="text-xs font-semibold text-muted-foreground">
          {pos + 1} / {CARDS.length}
        </span>
      </div>
      <div className="progress-track">
        <span style={{ width: `${((pos + 1) / CARDS.length) * 100}%` }} />
      </div>

      <div
        key={c.id}
        className="flip-scene"
        data-dir={dir}
        onTouchStart={(e) => (touch.current = draw ? null : e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 60) go(pos + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div
          className="flip-card"
          data-flipped={flipped}
          data-drawing={draw}
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={flipped ? "Show question" : "Flip to show answer"}
          onClick={() => !draw && setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !draw) {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
        >
          <div className="card-face gummy-card" aria-hidden={flipped}>
            <span className="eyebrow">Recall before you flip</span>
            <h2 className="card-q">{c.q}</h2>
            <p className="text-sm text-muted-foreground">Say your answer out loud, then tap to flip.</p>
            <span className="card-foot">{draw ? "Draw anywhere on this card" : "Tap for answer"}</span>
            {!flipped && (
              <DrawLayer strokes={strokes} active={draw} onCommit={(s) => (setStrokes(s), save(c.id, s))} />
            )}
          </div>
          <div className="card-face card-back gummy-card" aria-hidden={!flipped}>
            <span className="eyebrow">Answer</span>
            <h2 className="card-q text-lg">{c.q}</h2>
            <p className="leading-relaxed">{c.a}</p>
            <span className="card-foot">{draw ? "Draw anywhere on this card" : "Tap for question"}</span>
            {flipped && (
              <DrawLayer strokes={strokes} active={draw} onCommit={(s) => (setStrokes(s), save(c.id, s))} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[auto_1fr_auto] gap-3">
        <button className="gummy-icon lg" disabled={pos === 0} onClick={() => go(pos - 1)} aria-label="Previous">
          <ChevronLeft />
        </button>
        <button
          className="gummy-btn"
          data-variant={isKnown ? "success" : "soft"}
          onClick={() => {
            const k = isKnown ? known.filter((id) => id !== c.id) : [...known, c.id];
            setKnown(k);
            save("known", k);
          }}
        >
          <Check size={18} /> {isKnown ? "Learned" : "Mark learned"}
        </button>
        <button
          className="gummy-icon lg primary"
          disabled={pos === order.length - 1}
          onClick={() => go(pos + 1)}
          aria-label="Next"
        >
          <ChevronRight />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button className="gummy-btn" data-variant={draw ? "primary" : "ghost"} onClick={() => setDraw((d) => !d)}>
          <Pencil size={16} /> {draw ? "Done drawing" : "Draw on card"}
        </button>
        <button className="gummy-btn" data-variant="ghost" onClick={() => (setStrokes([]), save(c.id, []))}>
          <Eraser size={16} /> Clear
        </button>
      </div>
      <p className="caption mt-3 text-center">
        Swipe the card to move. Drawings save on this device after every stroke.
      </p>
    </Page>
  );
}
