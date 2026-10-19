import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Eraser, BookA, Check } from "lucide-react";
import { DrawLayer, type Stroke } from "@/components/study/DrawLayer";
import { SectionPills } from "@/components/study/Shell";
import { WordLab } from "@/components/study/WordLab";
import { BreakCard } from "@/components/study/BreakCard";
import { examQuery, logEvent, useGrade } from "@/lib/exam-data";
import { requeue, studyOrder, mastery, type Grade } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { pacedOrder } from "@/lib/pacing";
import { ReadAloud } from "@/lib/read-aloud";
import { chunks } from "@/lib/literacy";
import { load, save } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/exam/$examId/cards")({
  head: () => ({
    meta: [
      { title: "Flashcards · StudyLamb" },
      { name: "description", content: "Review your StudyLamb flashcards, one question at a time." },
      { property: "og:title", content: "Flashcards · StudyLamb" },
      { property: "og:description", content: "Review your StudyLamb flashcards, one question at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cards,
});

function Cards() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { s } = useSettings();
  const grade = useGrade(examId);
  const [section, setSection] = useState<string | null>(null);
  const initial = useMemo(
    () => pacedOrder(data.cards.filter((c) => !section || c.section_id === section), data.states, s.spaced, data.pace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, s.spaced, data.cards],
  );
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [draw, setDraw] = useState(false);
  const [lab, setLab] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [chunkDone, setChunkDone] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [dir, setDir] = useState(0);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    setQueue(initial);
    setPos(0);
    setFlipped(false);
  }, [initial]);
  const c = queue[pos];
  useEffect(() => {
    if (c) setStrokes(load(c.id, []));
  }, [c?.id]);

  const go = (n: number) => {
    if (n < 0 || n >= queue.length) return;
    setDir(n > pos ? 1 : -1);
    setPos(n);
    setFlipped(false);
    setDraw(false);
    setLab(false);
  };
  const rate = (g: Grade) => {
    if (!c) return;
    grade(c.id, "card", g);
    if (s.spaced) setQueue((q) => requeue(q, pos, g));
    const n = chunkDone + 1;
    setChunkDone(n);
    if (s.adhd && n % s.chunkSize === 0) setOnBreak(true);
    setDir(1);
    setPos((p) => p + 1);
    setFlipped(false);
    setDraw(false);
    setLab(false);
  };

  if (!data.cards.length) return <main className="fit-page"><p className="text-center text-muted-foreground">No cards yet.</p></main>;
  const doneAll = pos >= queue.length;
  const st = c ? data.states.get(c.id) : undefined;
  const sec = data.sections.find((x) => x.id === c?.section_id);

  return (
    <main className="fit-page">
      <SectionPills sections={data.sections} value={section} onChange={setSection} />
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="truncate text-primary">{sec?.title ?? "All sections"}</span>
        <span className="text-muted-foreground">
          {s.adhd ? `Chunk: ${chunkDone % s.chunkSize}/${s.chunkSize}` : `${Math.min(pos + 1, queue.length)} / ${queue.length}`}
        </span>
      </div>
      {s.adhd ? (
        <div className="chunk-dots">
          {Array.from({ length: s.chunkSize }, (_, i) => (
            <span key={i} data-on={i < chunkDone % s.chunkSize} />
          ))}
        </div>
      ) : (
        <div className="progress-track">
          <span style={{ width: `${(Math.min(pos + 1, queue.length) / queue.length) * 100}%` }} />
        </div>
      )}

      <div className="card-area">
        {onBreak ? (
          <BreakCard
            done={chunkDone}
            onPick={(v) => {
              logEvent(examId, "focus", v);
              setOnBreak(false);
            }}
            onContinue={() => setOnBreak(false)}
          />
        ) : doneAll || !c ? (
          <div className="gummy-card flex h-full flex-col items-center justify-center gap-3 text-center animate-pop">
            <span className="text-5xl">🎉</span>
            <h2 className="font-display text-2xl font-bold">All caught up!</h2>
            <p className="text-sm text-muted-foreground">Cards you missed will come back sooner. Known ones come back for quick review later.</p>
            <button className="gummy-btn" data-variant="primary" onClick={() => (setQueue(studyOrder(queue, data.states, s.spaced)), setPos(0))}>
              Review again
            </button>
          </div>
        ) : (
          <div
            key={c.id + pos}
            className="flip-scene h-full"
            data-dir={dir}
            onTouchStart={(e) => (touch.current = draw ? null : e.touches[0]!.clientX)}
            onTouchEnd={(e) => {
              if (touch.current == null || s.spaced) return;
              const dx = e.changedTouches[0]!.clientX - touch.current;
              if (Math.abs(dx) > 60) go(pos + (dx < 0 ? 1 : -1));
              touch.current = null;
            }}
          >
            <div
              className="flip-card h-full"
              data-flipped={flipped}
              data-drawing={draw}
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label={flipped ? "Show question" : "Flip to show answer"}
              onClick={() => !draw && !lab && setFlipped((f) => !f)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !draw) {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
            >
              <div className="card-face gummy-card" aria-hidden={flipped}>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{st ? (mastery(st) === "known" ? "Review" : "Still learning") : "New card"}</span>
                  <ReadAloud text={c.q} />
                </div>
                <h2 className="card-q">{c.q}</h2>
                <p className="text-sm text-muted-foreground">Say your answer out loud, then tap to flip.</p>
                <span className="card-foot">{draw ? "Draw anywhere on this card" : "Tap for answer"}</span>
                {!flipped && <DrawLayer strokes={strokes} active={draw} onCommit={(x) => (setStrokes(x), save(c.id, x))} />}
              </div>
              <div className="card-face card-back gummy-card" aria-hidden={!flipped}>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Answer</span>
                  <ReadAloud text={c.a} />
                </div>
                <div className="card-scroll">
                  <h2 className="mt-2 text-base font-extrabold leading-snug">{c.q}</h2>
                  {lab ? (
                    <>
                      <p className="mt-2 leading-relaxed">{c.a}</p>
                      <WordLab text={c.a} />
                    </>
                  ) : s.adhd ? (
                    <ul className="answer-chunks">
                      {chunks(c.a).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 leading-relaxed">{c.a}</p>
                  )}
                </div>
                {flipped && <DrawLayer strokes={strokes} active={draw} onCommit={(x) => (setStrokes(x), save(c.id, x))} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {!onBreak && !doneAll && c && (
        <>
          <div className="tool-row">
            {!s.spaced && (
              <button className="gummy-icon sm" disabled={pos === 0} onClick={() => go(pos - 1)} aria-label="Previous">
                <ChevronLeft size={18} />
              </button>
            )}
            <button className="gummy-chip" data-on={draw} onClick={() => setDraw(!draw)}>
              <Pencil size={14} /> {draw ? "Done" : "Draw"}
            </button>
            <button className="gummy-chip" onClick={() => (setStrokes([]), save(c.id, []))}>
              <Eraser size={14} /> Clear
            </button>
            {s.dyslexia && flipped && (
              <button className="gummy-chip" data-on={lab} onClick={() => setLab(!lab)}>
                <BookA size={14} /> Word lab
              </button>
            )}
            {!s.spaced && (
              <button className="gummy-icon sm" disabled={pos === queue.length - 1} onClick={() => go(pos + 1)} aria-label="Next">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          {flipped ? (
            <div className="grade-row animate-pop">
              <button className="gummy-btn" data-variant="again" onClick={() => rate("again")}>
                Again
              </button>
              <button className="gummy-btn" data-variant="soft" onClick={() => rate("good")}>
                <Check size={16} /> Got it
              </button>
              <button className="gummy-btn" data-variant="success" onClick={() => rate("easy")}>
                Easy
              </button>
            </div>
          ) : (
            <button className="gummy-btn w-full" data-variant="primary" onClick={() => setFlipped(true)}>
              Show answer
            </button>
          )}
        </>
      )}
    </main>
  );
}
