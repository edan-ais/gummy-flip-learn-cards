import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronUp, Headphones, Layers, Mic, PencilLine, RefreshCw, Upload } from "lucide-react";
import lamby from "@/assets/professor-lamby.png.asset.json";

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
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<string>("see");
  const [moodIdx, setMoodIdx] = useState(0);
  const [supportShown, setSupportShown] = useState(true);
  const touchY = useRef<number | null>(null);
  const touchX = useRef<number | null>(null);

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

  const finish = () => {
    try {
      localStorage.setItem("studylamb-onboarded", "1");
    } catch {
      // private browsing - the flow still finishes
    }
    nav({ to: "/courses" });
  };

  const cls = (i: number, extra = "") =>
    `onb-screen${extra}${i === step ? " on" : i < step ? " past" : ""}`;

  return (
    <main className="onb-stage" aria-label="StudyLamb welcome">
      {/* 1 · Welcome */}
      <section
        className={cls(0, " lav")}
        onTouchStart={(e) => {
          touchY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchY.current === null) return;
          const dy = (e.changedTouches[0]?.clientY ?? touchY.current) - touchY.current;
          touchY.current = null;
          if (dy < -40) go(1);
        }}
      >
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
          <div className="onb-swipehint">
            <ChevronUp size={16} className="chev" aria-hidden />
            Swipe up to start
          </div>
          <button className="onb-cta" onClick={() => go(1)}>
            Continue
          </button>
        </div>
      </section>

      {/* 2 · Add your notes */}
      <section className={cls(1)}>
        <div className="onb-body">
          <Steps of={1} />
          <div className="onb-ht left">Add your study guide.</div>
          <div className="onb-sb left">
            Notes, slides, or a Quizlet link. Professor Lamby turns them into your study kit.
          </div>
          <div className="onb-dropzone">
            <Upload size={20} aria-hidden />
            <span className="dz-t">Drop files here</span>
            <span className="dz-s">PDF, photos, or doc</span>
          </div>
          <div className="onb-linkrow">
            <input
              type="text"
              inputMode="url"
              placeholder="or paste a Quizlet link…"
              aria-label="Paste a Quizlet link"
            />
          </div>
          <div className="onb-reassure">Takes about a minute.</div>
        </div>
        <div className="onb-foot">
          <button className="onb-cta" onClick={() => go(2)}>
            Add my notes
          </button>
          <button className="onb-ghost" onClick={() => go(2)}>
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
            </div>
            <div className="onb-kitrow">
              <span className="ic red">
                <RefreshCw size={19} aria-hidden />
              </span>
              <span>
                <div className="kr-t">Quiz yourself</div>
                <div className="kr-s">Type the first letter of each word until it sticks.</div>
              </span>
            </div>
            <div className="onb-kitrow">
              <span className="ic">
                <Headphones size={19} aria-hidden />
              </span>
              <span>
                <div className="kr-t">Listen on the go</div>
                <div className="kr-s">Your notes as a podcast, for walks and drives.</div>
              </span>
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
          <div
            className="onb-moods"
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
              touchX.current = null;
              if (dx < -30) pickMood(moodIdx + 1);
              else if (dx > 30) pickMood(moodIdx - 1);
            }}
          >
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
          <div className="onb-support" data-show={supportShown}>
            {SUPPORT[mood]}
          </div>
        </div>
        <div className="onb-foot">
          <div className="onb-swipehint row">‹&nbsp;&nbsp;Swipe to choose&nbsp;&nbsp;›</div>
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
    </main>
  );
}
