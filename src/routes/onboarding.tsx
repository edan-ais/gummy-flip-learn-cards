// ============= Full file contents =============

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Headphones, Layers, Mic, PencilLine, RefreshCw, Upload, X } from "lucide-react";
import lamby from "@/assets/professor-lamby.png.asset.json";
import { setPendingUpload } from "@/lib/pending-upload";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome · StudyLamb" },
      {
        name: "description",
        content: "Meet Professor Lamby and set up your study kit, at your pace.",
      },
      { property: "og:title", content: "Welcome · StudyLamb" },
      {
        property: "og:description",
        content: "Meet Professor Lamby and set up your study kit, at your pace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const MOODS = ["nervous", "okay", "ready"] as const;
type Mood = (typeof MOODS)[number];

const SUPPORT: Record<Mood, string> = {
  nervous: "Not yet is fine. We'll go one card at a time.",
  okay: "Okay works. Steady is enough - one card at a time.",
  ready: "Good. Your first card is waiting when you are.",
};

const STUDY_STYLES = [
  { id: "see", title: "See it", sub: "Flashcards", Icon: Layers },
  { id: "write", title: "Write it", sub: "Doodle", Icon: PencilLine },
  { id: "hear", title: "Hear it", sub: "Audio", Icon: Headphones },
  { id: "say", title: "Say it", sub: "Out loud", Icon: Mic },
] as const;

const BRAND: { title: string; sub: string }[] = [
  { title: "Meet Professor Lamby.", sub: "A study coach built from your own notes. Calm, step by step, at your pace." },
  { title: "Add your study guide.", sub: "Drop in a PDF, photos or notes - Lamby turns them into your study kit." },
  { title: "Your study kit.", sub: "Cards, memory drills and a podcast, all made from the same notes." },
  { title: "How do you like to study?", sub: "Pick a starting point. You can change it anytime." },
  { title: "How are you feeling about the exam?", sub: "Lamby sets the pace to match - no streaks, no timers." },
  { title: "Your plan, at your pace.", sub: "A few cards a day until the big day. Miss a day and pick up where you left off." },
  { title: "All set.", sub: "Your first deck is ready when you are." },
];

type PickedFile = { id: string; name: string; file: File; kind: "pdf" | "image" | "doc" | "text" };

const kindOf = (f: File): PickedFile["kind"] | null => {
  if (f.type === "application/pdf") return "pdf";
  if (f.type.startsWith("image/")) return "image";
  if (f.name.endsWith(".docx")) return "doc";
  if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) return "text";
  return null;
};

function Steps({ of }: { of: number }) {
  return (
    <>
      <div className="onb-progress">Step {of} of 4</div>
      <div className="onb-dots">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= of ? "on" : undefined} />
        ))}
      </div>
    </>
  );
}

function Onboarding() {
  const nav = useNavigate();
  const mobile = useIsMobile();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<string>("see");
  const [moodIdx, setMoodIdx] = useState(0);
  const [supportShown, setSupportShown] = useState(true);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [courseName, setCourseName] = useState("");
  const [paste, setPaste] = useState("");
  const [savedPaste, setSavedPaste] = useState("");
  const [drag, setDrag] = useState(false);

  const go = (n: number) => {
    if (n >= 0 && n <= 6) setStep(n);
  };

  const mood = MOODS[moodIdx];
  const pickMood = (i: number) => {
    const next = Math.max(0, Math.min(MOODS.length - 1, i));
    if (next === moodIdx) return;
    setMoodIdx(next);
    setSupportShown(false);
    window.setTimeout(() => setSupportShown(true), 180);
  };

  const addFiles = (list: FileList | File[] | null) => {
    const next: PickedFile[] = [];
    for (const f of Array.from(list ?? [])) {
      const k = kindOf(f);
      if (!k || f.size > 25 * 1024 * 1024) continue;
      if (files.some((x) => x.name === f.name && x.file.size === f.size)) continue;
      next.push({ id: crypto.randomUUID(), name: f.name, file: f, kind: k });
    }
    if (next.length) setFiles((x) => [...x, ...next]);
  };

  const savePaste = () => {
    if (paste.trim()) {
      setSavedPaste(paste.trim());
      setPaste("");
    }
  };

  const finish = () => {
    try {
      localStorage.setItem("studylamb-onboarded", "1");
    } catch {
      // private browsing - the flow still finishes
    }
    const text = savedPaste || paste.trim();
    if (files.length || text) {
      setPendingUpload({
        files: files.map((f) => f.file),
        text: text || undefined,
        courseName: courseName.trim() || undefined,
      });
      const course = courseName.trim() ? `&course=${encodeURIComponent(courseName.trim())}` : "";
      nav({ to: "/auth", search: { redirect: `/exams/new?pending=1${course}` } });
    } else {
      nav({ to: "/courses" });
    }
  };

  const cls = (i: number, extra = "") =>
    `onb-screen${extra}${i === step ? " on" : i < step ? " past" : ""}`;

  return (
    <main className="onb-stage" aria-label="StudyLamb welcome"
      onTouchStart={(e) => {
        const point = e.touches[0];
        const target = e.target as HTMLElement;
        touch.current = mobile && point && !target.closest("button, input, a, [role='button']") ? { x: point.clientX, y: point.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        const end = e.changedTouches[0];
        if (!mobile || !start || !end) return;
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;
        if (step === 4 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) pickMood(moodIdx + (dx < 0 ? 1 : -1));
        else if (dy < -60 && Math.abs(dy) > Math.abs(dx)) go(step + 1);
      }}>
      {/* Web-only brand panel; hidden on phones by CSS */}
      <aside className="onb-brand">
        <div className="onb-wordmark">StudyLamb</div>
        <div className={`onb-brandwrap${step === 4 ? ` m-${mood}` : ""}`}>
          <img src={lamby.url} alt="Professor Lamby, a soft light-blue lamb with a blue bow" />
        </div>
        <div className="onb-brandcopy" key={step}>
          <h2>{BRAND[step].title}</h2>
          <p>{BRAND[step].sub}</p>
        </div>
        <div className="onb-brandfoot">Powered by waiwiser</div>
      </aside>

      <div className="onb-panel">
        {/* 1 · Welcome */}
        <section className={cls(0, " lav")}>
          <div className="onb-body">
            <div className="onb-wordmark">StudyLamb</div>
            <img
              className="onb-lamby wave"
              src={lamby.url}
              alt="Professor Lamby, a soft light-blue lamb with a blue bow, waving"
            />
            <div className="onb-ht">Meet Professor Lamby.</div>
            <div className="onb-sb">
              A study coach built from your own notes. Calm, step by step, at your pace.
            </div>
          </div>
          <div className="onb-foot">
            {mobile && <p className="caption text-center">Swipe up to start</p>}
            <button className="onb-cta" onClick={() => go(1)}>
              Continue
            </button>
          </div>
        </section>

        {/* 2 · Add your notes (working upload) */}
        <section className={cls(1)}>
          <div className="onb-body">
            <Steps of={1} />
            <div className="onb-ht left">Add your study guide.</div>
            <div className="onb-sb left">
              Notes, slides, or photos. Professor Lamby turns them into your study kit.
            </div>
            <input
              className="onb-classrow"
              type="text"
              placeholder="Class name, e.g. Science or Math"
              aria-label="Class name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
            <div
              className={`onb-dropzone${drag ? " drag" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="Choose files to upload"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <Upload size={20} aria-hidden />
              <span className="dz-t">Drop files here</span>
              <span className="dz-s">PDF, photos, Word or text files</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept=".pdf,image/*,.docx,.txt,.md,text/plain"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="onb-picked">
                {files.map((f) => (
                  <li key={f.id}>
                    <span className="pf-n">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}
                      aria-label={`Remove ${f.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="onb-linkrow">
              <input
                type="text"
                placeholder="or paste your notes here…"
                aria-label="Paste your notes"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
            </div>
            <div className="onb-reassure">Takes about a minute.</div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta" onClick={() => { savePaste(); go(2); }}>
              Add my notes
            </button>
            <button className="onb-ghost" onClick={() => { savePaste(); go(2); }}>
              I'll do this later
            </button>
          </div>
        </section>

        {/* 3 · Your study kit */}
        <section className={cls(2)}>
          <div className="onb-body">
            <Steps of={2} />
            <div className="onb-ht left">Your study kit.</div>
            <div className="onb-sb left">Three tools, all made from your notes.</div>
            <div className="onb-kitrows">
              <div className="onb-kitrow">
                <span className="ic">
                  <Layers size={19} aria-hidden />
                </span>
                <span>
                  <div className="kr-t">Flip through cards</div>
                  <div className="kr-s">Doodle right on the card, like paper.</div>
                </span>
                <div className="onb-demo dm-card" aria-hidden>
                  <div className="dm-inner">
                    <span className="dm-q">Q</span>
                    <span className="dm-a">A</span>
                  </div>
                </div>
              </div>
              <div className="onb-kitrow">
                <span className="ic red">
                  <RefreshCw size={19} aria-hidden />
                </span>
                <span>
                  <div className="kr-t">Quiz yourself</div>
                  <div className="kr-s">Type the first letter of each word until it sticks.</div>
                </span>
                <div className="onb-demo dm-quiz" aria-hidden>
                  {"photo".split("").map((c, i) => (
                    <i key={i} style={{ animationDelay: `${i * 0.35}s` }}>
                      {c}
                    </i>
                  ))}
                </div>
              </div>
              <div className="onb-kitrow">
                <span className="ic">
                  <Headphones size={19} aria-hidden />
                </span>
                <span>
                  <div className="kr-t">Listen on the go</div>
                  <div className="kr-s">Your notes as a podcast, for walks and drives.</div>
                </span>
                <div className="onb-demo dm-pod" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta" onClick={() => go(3)}>
              Got it
            </button>
          </div>
        </section>

        {/* 4 · How do you like to study? */}
        <section className={cls(3)}>
          <div className="onb-body">
            <Steps of={3} />
            <div className="onb-ht left">How do you like to study?</div>
            <div className="onb-sb left">Pick one. You can change it anytime.</div>
            <div className="onb-optgrid">
              {STUDY_STYLES.map(({ id, title, sub, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`onb-opt${style === id ? " sel" : ""}`}
                  onClick={() => setStyle(id)}
                >
                  <span className="tick">✓</span>
                  <Icon size={19} aria-hidden />
                  <span className="o-t">{title}</span>
                  <span className="o-s">{sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta" onClick={() => go(4)}>
              Continue
            </button>
          </div>
        </section>

        {/* 5 · Mood check */}
        <section className={cls(4)}>
          <div className="onb-body">
            <Steps of={4} />
            <div className="onb-ht">How are you feeling about the exam?</div>
            <div className={`onb-lambywrap m-${mood}`}>
              <img src={lamby.url} alt="Professor Lamby reacting to the chosen mood" />
            </div>
            <div className="onb-moods">
              <button
                className={`onb-mood${mood === "nervous" ? " sel" : ""}`}
                onClick={() => pickMood(0)}
              >
                A little nervous
              </button>
              <button
                className={`onb-mood${mood === "okay" ? " sel" : ""}`}
                onClick={() => pickMood(1)}
              >
                Okay
              </button>
              <button
                className={`onb-mood${mood === "ready" ? " sel" : ""}`}
                onClick={() => pickMood(2)}
              >
                Ready
              </button>
            </div>
            {mobile && <p className="caption text-center">Swipe to choose</p>}
            <div className="onb-support" data-show={supportShown}>
              {SUPPORT[mood]}
            </div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta" onClick={() => go(5)}>
              Continue
            </button>
          </div>
        </section>

        {/* 6 · Your plan */}
        <section className={cls(5)}>
          <div className="onb-body">
            <div className="onb-ht left">Your plan, at your pace.</div>
            <div className="onb-plancard">
              <div className="pc-exam">Psychology Exam 2 · 12 days away</div>
              <div className="pc-main">About 5 cards a day.</div>
              <div className="pc-row">
                <span>Today</span>
                <b>5 cards + 1 quiz</b>
              </div>
              <div className="pc-row">
                <span>Done today</span>
                <b>0 of 2</b>
              </div>
            </div>
            <div className="onb-noguilt">
              No streaks, no timers. Miss a day and we pick up where you left off.
            </div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta" onClick={() => go(6)}>
              Sounds good
            </button>
          </div>
        </section>

        {/* 7 · All set */}
        <section className={cls(6, " green")}>
          <div className="onb-body">
            <div className="onb-checkcircle">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </div>
            <img className="onb-lamby sm" src={lamby.url} alt="Professor Lamby celebrating" />
            <div className="onb-ht">Your first deck is ready.</div>
            <div className="onb-winrow">
              <span className="win">1 deck</span>
              <span className="win">20 cards</span>
              <span className="win">about 5 minutes</span>
            </div>
          </div>
          <div className="onb-foot">
            <button className="onb-cta green" onClick={finish}>
              Start studying
            </button>
            <button className="onb-ghost" onClick={finish}>
              Look around first
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
