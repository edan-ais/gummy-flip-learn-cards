import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import ch4 from "@/assets/2-ch4.m4a.asset.json";
import ch6 from "@/assets/3-ch6.m4a.asset.json";
import ch7 from "@/assets/4-ch7.m4a.asset.json";
import { LABELS } from "./study";

export const TRACKS = [
  { ch: 4, title: "Growing through life", detail: "Erikson · Piaget · attachment · adolescence", src: ch4.url },
  { ch: 6, title: "How learning happens", detail: "Pavlov · consequences · schedules · Bandura", src: ch6.url },
  { ch: 7, title: "Make it memorable", detail: "Encoding · storage · retrieval · exam recall", src: ch7.url },
];

type Player = {
  track: number;
  playing: boolean;
  started: boolean;
  time: number;
  duration: number;
  error: string;
  select: (n: number, play?: boolean) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (d: number) => void;
};
const Ctx = createContext<Player | null>(null);
export const usePlayer = () => useContext(Ctx)!;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const trackRef = useRef(0);

  const select = (n: number, play = false) => {
    const a = ref.current!;
    if (n !== trackRef.current) {
      trackRef.current = n;
      setTrack(n);
      a.src = TRACKS[n].src;
      setTime(0);
    }
    setError("");
    if (play) a.play().catch(() => {});
  };
  const toggle = () => {
    const a = ref.current!;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const seek = (t: number) => {
    if (ref.current) ref.current.currentTime = t;
  };
  const skip = (d: number) => {
    const a = ref.current!;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d));
  };

  useEffect(() => {
    const t = TRACKS[track]!;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: "Psychology study studio",
        album: LABELS[t.ch],
      });
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [track, playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const h: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => ref.current?.play()],
      ["pause", () => ref.current?.pause()],
      ["seekbackward", (d) => skip(-(d.seekOffset || 10))],
      ["seekforward", (d) => skip(d.seekOffset || 10)],
      ["previoustrack", () => select(Math.max(0, trackRef.current - 1), true)],
      ["nexttrack", () => select(Math.min(TRACKS.length - 1, trackRef.current + 1), true)],
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
    <Ctx.Provider value={{ track, playing, started, time, duration, error, select, toggle, seek, skip }}>
      {children}
      <audio
        ref={ref}
        src={TRACKS[0].src}
        preload="metadata"
        playsInline
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (trackRef.current < TRACKS.length - 1) select(trackRef.current + 1, true);
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
