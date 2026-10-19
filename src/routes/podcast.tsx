import { createFileRoute } from "@tanstack/react-router";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Heart, MoreHorizontal, ArrowDownCircle, Clock, Repeat } from "lucide-react";
import cover from "@/assets/cover.jpg.asset.json";
import { usePlayer, TRACKS, fmt } from "@/lib/player";
import { LABELS } from "@/lib/study";

export const Route = createFileRoute("/podcast")({
  head: () => ({
    meta: [
      { title: "Think it through · Study Playlist" },
      { name: "description", content: "Three podcast episodes covering Exam 2 Ch 4, 6 and 7 with recall breaks." },
      { property: "og:title", content: "Think it through · Study Playlist" },
      { property: "og:description", content: "Listen, pause, recall. Exam 2 psychology podcast playlist." },
    ],
  }),
  component: Podcast,
});

function Podcast() {
  const p = usePlayer();
  const t = TRACKS[p.track]!;
  return (
    <main className="sp-page">
      <div className="sp-hero">
        <img src={cover.url} alt="Psychology podcast cover" className="sp-cover" />
      </div>
      <div className="px-4">
        <h1 className="sp-title">Think it through</h1>
        <p className="sp-desc">Three chapters. Two hosts per episode. Your guide, explained with recall breaks.</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="sp-avatar">P</span>
          <span className="text-sm font-bold">Psychology study studio</span>
        </div>
        <p className="sp-meta mt-1">Exam 2 · Study playlist · {TRACKS.length} episodes</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-5 sp-muted">
            <Heart size={24} />
            <ArrowDownCircle size={24} />
            <MoreHorizontal size={24} />
          </div>
          <div className="flex items-center gap-5">
            <Shuffle size={24} className="sp-muted" />
            <button className="sp-play" onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"}>
              {p.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        </div>

        <ul className="mt-4">
          {TRACKS.map((tr, i) => {
            const active = i === p.track;
            return (
              <li key={tr.src}>
                <button className="sp-row" onClick={() => (active ? p.toggle() : p.select(i, true))}>
                  <img src={cover.url} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="sp-row-title truncate" data-active={active}>
                      {active && p.playing && <Eq />}
                      {tr.title}
                    </p>
                    <p className="sp-meta truncate">
                      {LABELS[tr.ch]} · {tr.detail}
                    </p>
                  </div>
                  <MoreHorizontal size={20} className="sp-muted" />
                </button>
              </li>
            );
          })}
        </ul>
        {p.error && <p className="mt-3 text-sm sp-error" role="status">{p.error}</p>}
        <p className="sp-meta mt-6 flex items-center gap-1">
          <Clock size={14} /> Pause to answer the quiz prompts. Keeps playing when you lock your phone.
        </p>
      </div>

      <div className="sp-now">
        <div className="flex items-center gap-3">
          <img src={cover.url} alt="" className="h-10 w-10 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{t.title}</p>
            <p className="truncate text-xs sp-muted">{LABELS[t.ch]}</p>
          </div>
          <button onClick={() => p.select(Math.max(0, p.track - 1), true)} aria-label="Previous episode">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"}>
            {p.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button onClick={() => p.select(Math.min(TRACKS.length - 1, p.track + 1), true)} aria-label="Next episode">
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
        <input
          type="range"
          className="sp-seek"
          min={0}
          max={p.duration || 0}
          step={1}
          value={p.time}
          onChange={(e) => p.seek(Number(e.target.value))}
          aria-label="Seek"
          style={{ ["--pct" as string]: `${(p.time / (p.duration || 1)) * 100}%` }}
        />
        <div className="flex justify-between text-[11px] sp-muted">
          <span>{fmt(p.time)}</span>
          <span className="flex items-center gap-3">
            <button onClick={() => p.skip(-15)} aria-label="Back 15 seconds">-15s</button>
            <Repeat size={12} />
            <button onClick={() => p.skip(15)} aria-label="Forward 15 seconds">+15s</button>
          </span>
          <span>{fmt(p.duration)}</span>
        </div>
      </div>
    </main>
  );
}

function Eq() {
  return (
    <span className="sp-eq" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}
