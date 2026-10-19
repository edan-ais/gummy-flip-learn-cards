import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSettings } from "./settings";

export type Track = { key: string; title: string; subtitle: string; resolve: () => Promise<string[]> };

type Player = {
  queue: Track[];
  index: number;
  current?: Track;
  playing: boolean;
  loading: boolean;
  started: boolean;
  time: number;
  duration: number;
  error: string;
  playQueue: (q: Track[], i?: number) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (d: number) => void;
  jump: (d: number) => void;
  close: () => void;
};
const Ctx = createContext<Player | null>(null);
export const usePlayer = () => {
  const player = useContext(Ctx);
  if (!player) throw new Error("PlayerProvider is required");
  return player;
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { s } = useSettings();
  const ref = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const parts = useRef<{ urls: string[]; i: number }>({ urls: [], i: 0 });
  const qRef = useRef<Track[]>([]);
  const iRef = useRef(0);
  const token = useRef(0);
  const cache = useRef(new Map<string, string[]>());

  const load = async (q: Track[], i: number) => {
    const t = q[i];
    if (!t) return;
    const my = ++token.current;
    iRef.current = i;
    setIndex(i);
    setError("");
    setLoading(true);
    setStarted(true);
    try {
      const urls = cache.current.get(t.key) ?? (await t.resolve());
      cache.current.set(t.key, urls);
      if (my !== token.current) return;
      parts.current = { urls, i: 0 };
      const a = ref.current;
      const first = urls[0];
      if (!a || !first) return;
      a.src = first;
      a.playbackRate = s.speechRate;
      await a.play().catch(() => {});
      // Prefetch next track
      const n = q[i + 1];
      if (n && !cache.current.has(n.key)) n.resolve().then((u) => cache.current.set(n.key, u)).catch(() => {});
    } catch (e) {
      if (my === token.current) setError(e instanceof Error ? e.message : "Could not load audio.");
    } finally {
      if (my === token.current) setLoading(false);
    }
  };

  const playQueue = (q: Track[], i = 0) => {
    qRef.current = q;
    setQueue(q);
    load(q, i);
  };
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (!a.src && qRef.current.length) return load(qRef.current, iRef.current);
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const jump = (d: number) => {
    const n = Math.max(0, Math.min(qRef.current.length - 1, iRef.current + d));
    load(qRef.current, n);
  };
  const seek = (t: number) => {
    if (ref.current) ref.current.currentTime = t;
  };
  const skip = (d: number) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d));
  };

  const close = () => {
    token.current++;
    const a = ref.current;
    if (a) { a.pause(); a.removeAttribute("src"); a.load(); }
    parts.current = { urls: [], i: 0 };
    qRef.current = [];
    setQueue([]);
    setStarted(false);
    setPlaying(false);
    setLoading(false);
    setTime(0);
    setDuration(0);
    setError("");
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
  };

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = s.speechRate;
  }, [s.speechRate]);

  const current = queue[index];
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: "StudyLamb",
      album: current.subtitle,
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [current, playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const h: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => ref.current?.play()],
      ["pause", () => ref.current?.pause()],
      ["seekbackward", (d) => skip(-(d.seekOffset || 10))],
      ["seekforward", (d) => skip(d.seekOffset || 10)],
      ["previoustrack", () => jump(-1)],
      ["nexttrack", () => jump(1)],
    ];
    for (const [n, f] of h) {
      try {
        navigator.mediaSession.setActionHandler(n, f);
      } catch {
        /* unsupported */
      }
    }
  }, []);

  return (
    <Ctx.Provider
      value={{ queue, index, current, playing, loading, started, time, duration, error, playQueue, toggle, seek, skip, jump, close }}
    >
      {children}
      <audio
        ref={ref}
        preload="metadata"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          e.currentTarget.playbackRate = s.speechRate;
        }}
        onEnded={() => {
          const p = parts.current;
          if (p.i < p.urls.length - 1) {
            p.i += 1;
            const a = ref.current;
            const next = p.urls[p.i];
            if (!a || !next) return;
            a.src = next;
            a.play().catch(() => {});
          } else if (iRef.current < qRef.current.length - 1) load(qRef.current, iRef.current + 1);
        }}
        onError={() => setError("Track could not load. Check your connection and try again.")}
      />
    </Ctx.Provider>
  );
}

export const fmt = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
