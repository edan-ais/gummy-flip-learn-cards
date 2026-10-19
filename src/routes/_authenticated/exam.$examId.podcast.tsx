import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, MoreHorizontal, Loader2, Sparkles, MessagesSquare, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { examQuery } from "@/lib/exam-data";
import { usePlayer, fmt, type Track } from "@/lib/player";
import { episodeAudio, speak } from "@/lib/study.functions";
import { studyOrder, weakness, mastery } from "@/lib/srs";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/exam/$examId/podcast")({
  component: Podcast,
});

function Podcast() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { s } = useSettings();
  const qc = useQueryClient();
  const p = usePlayer();
  const ep = useServerFn(episodeAudio);
  const say = useServerFn(speak);
  const [mode, setMode] = useState<"qa" | "abstract">("abstract");
  const [making, setMaking] = useState<string | null>(null);

  const qa = useMemo(() => {
    const ordered = s.spaced
      ? [...data.cards].sort((a, b) => weakness(data.states.get(b.id)) - weakness(data.states.get(a.id)))
      : studyOrder(data.cards, data.states, false);
    return ordered;
  }, [data, s.spaced]);

  const qaTracks: Track[] = qa.map((c) => ({
    key: `qa:${c.id}`,
    title: c.q,
    subtitle: "Q&A",
    resolve: async () => (await say({ data: { text: `Question. ${c.q} ... Think about it. ... Answer. ${c.a}` } })).urls,
  }));
  const absTracks: Track[] = data.podcasts.map((x) => ({
    key: `ep:${x.id}`,
    title: x.title,
    subtitle: x.detail || "Episode",
    resolve: async () => {
      if (x.status !== "ready") setMaking(x.id);
      try {
        const r = await ep({ data: { podcastId: x.id } });
        if (x.status !== "ready") qc.invalidateQueries({ queryKey: ["exam", examId] });
        return r.urls;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not make this episode.");
        throw e;
      } finally {
        setMaking(null);
      }
    },
  }));

  const tracks = mode === "qa" ? qaTracks : absTracks;
  const inThis = p.current && tracks.some((t) => t.key === p.current!.key);
  const playAll = () => (inThis ? p.toggle() : p.playQueue(tracks, 0));

  return (
    <main className="pod-page">
      <div className="pod-hero">
        <div className="pod-cover" data-mode={mode}>
          {mode === "qa" ? <MessagesSquare size={64} /> : <Sparkles size={64} />}
          <span>{data.exam.title}</span>
        </div>
      </div>
      <div className="px-4">
        <div className="seg mt-1" role="tablist">
          <button role="tab" aria-selected={mode === "abstract"} data-active={mode === "abstract"} onClick={() => setMode("abstract")}>
            <Wand2 size={15} /> Abstract
          </button>
          <button role="tab" aria-selected={mode === "qa"} data-active={mode === "qa"} onClick={() => setMode("qa")}>
            <MessagesSquare size={15} /> Q&A
          </button>
        </div>
        <h1 className="pod-title mt-4">{mode === "qa" ? "Every question, answered" : "Make it memorable"}</h1>
        <p className="pod-desc">
          {mode === "qa"
            ? s.spaced
              ? "All questions and answers, the ones you're struggling with first."
              : "All questions and answers, in order."
            : "Each section told as a story with analogies, mnemonics and recall breaks."}
        </p>
        <p className="pod-meta mt-1">
          {data.exam.course?.title} · {tracks.length} {mode === "qa" ? "questions" : "episodes"}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-5 text-muted-foreground">
            <MoreHorizontal size={24} />
          </div>
          <div className="flex items-center gap-5">
            <button aria-label="Shuffle" className="text-muted-foreground" onClick={() => p.playQueue([...tracks].sort(() => Math.random() - 0.5), 0)}>
              <Shuffle size={24} />
            </button>
            <button className="pod-play" onClick={playAll} aria-label={inThis && p.playing ? "Pause" : "Play all"} disabled={!tracks.length}>
              {inThis && p.loading ? <Loader2 className="animate-spin" /> : inThis && p.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        </div>

        <ul className="mt-3">
          {tracks.map((t, i) => {
            const active = p.current?.key === t.key;
            const pod = mode === "abstract" ? data.podcasts[i] : undefined;
            const card = mode === "qa" ? qa[i] : undefined;
            const m = card ? mastery(data.states.get(card.id)) : null;
            return (
              <li key={t.key}>
                <button className="pod-row" onClick={() => (active ? p.toggle() : p.playQueue(tracks, i))}>
                  <span className="pod-thumb" data-mode={mode}>
                    {making === pod?.id ? <Loader2 size={18} className="animate-spin" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="pod-row-title truncate" data-active={active}>
                      {active && p.playing && <Eq />}
                      {t.title}
                    </p>
                    <p className="pod-meta truncate">
                      {pod
                        ? pod.status === "ready"
                          ? t.subtitle
                          : making === pod.id
                            ? "Creating your episode… about a minute"
                            : data.exam.is_sample ? t.subtitle : "Tap to create this episode"
                        : m === "known"
                          ? "Known · review"
                          : m === "learning"
                            ? "Still learning"
                            : "New"}
                    </p>
                  </div>
                  <MoreHorizontal size={20} className="text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
        {p.error && inThis && <p className="mt-3 text-sm text-destructive" role="status">{p.error}</p>}
      </div>

      {inThis && p.current && (
        <div className="pod-now">
          <div className="flex items-center gap-3">
            <span className="pod-thumb sm" data-mode={mode}>
              {mode === "qa" ? <MessagesSquare size={16} /> : <Sparkles size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.current.title}</p>
              <p className="truncate text-xs text-muted-foreground">{p.current.subtitle}</p>
            </div>
            <button onClick={() => p.jump(-1)} aria-label="Previous">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"}>
              {p.loading ? <Loader2 className="animate-spin" /> : p.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button onClick={() => p.jump(1)} aria-label="Next">
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
          <input
            type="range"
            className="pod-seek"
            min={0}
            max={p.duration || 0}
            step={1}
            value={p.time}
            onChange={(e) => p.seek(Number(e.target.value))}
            aria-label="Seek"
            style={{ ["--pct" as string]: `${(p.time / (p.duration || 1)) * 100}%` }}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{fmt(p.time)}</span>
            <span className="flex gap-3">
              <button onClick={() => p.skip(-15)}>-15s</button>
              <span>{s.speechRate}×</span>
              <button onClick={() => p.skip(15)}>+15s</button>
            </span>
            <span>{fmt(p.duration)}</span>
          </div>
        </div>
      )}
    </main>
  );
}

function Eq() {
  return (
    <span className="pod-eq" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}
