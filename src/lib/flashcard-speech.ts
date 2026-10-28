import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { speak } from "./study.functions";
import { useGems, useSpendGuard, actionError } from "./gems-client";

export function speechWords(text: string) {
  return Array.from(text.matchAll(/\S+/g), (match) => ({ text: match[0], start: match.index ?? 0 }));
}

export function wordAtOffset(text: string, offset: number) {
  const words = speechWords(text);
  return words.findIndex((word, i) => offset >= word.start && offset < (words[i + 1]?.start ?? text.length + 1));
}

const clips = new Map<string, { urls: string[]; texts: string[] }>();

export function playbackWord(text: string, time: number, duration: number) {
  const words = speechWords(text);
  if (!words.length || !Number.isFinite(duration) || duration <= 0) return -1;
  const weights = words.map((w) => Math.max(2, w.text.length) + (/[.!?,;:]$/.test(w.text) ? 3 : 0));
  const target = Math.min(0.999999, Math.max(0, time / duration)) * weights.reduce((sum, n) => sum + n, 0);
  let total = 0;
  return weights.findIndex((weight) => { total += weight; return total > target; });
}

/** Shared podcast-narrator audio; highlighting estimates word position from playback time. */
export function useFlashcardSpeech(text: string, enabled: boolean, rate: number, autoKey?: string) {
  const fn = useServerFn(speak);
  const { confirmSpend, dialog } = useSpendGuard();
  const { refresh } = useGems();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [word, setWord] = useState(-1);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    audio.current = null;
    setPlaying(false);
    setLoading(false);
    setWord(-1);
  }, []);

  useEffect(() => {
    stop();
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { stop(); document.removeEventListener("visibilitychange", hide); };
  }, [text, enabled, autoKey, stop]);

  useEffect(() => { if (audio.current) audio.current.playbackRate = rate; }, [rate]);

  const start = async () => {
    if (!enabled || !text.trim()) return;
    stop();
    const my = token.current;
    setLoading(true);
    setError("");
    try {
      let clip = clips.get(text);
      if (!clip) {
        const quote = await fn({ data: { text, quoteOnly: true } });
        if (my !== token.current) return;
        if (quote.cost > 0 && !(await confirmSpend(quote.cost))) { if (my === token.current) stop(); return; }
        if (my !== token.current) return;
        clip = await fn({ data: { text } });
        clips.set(text, clip);
        refresh();
      }
      if (my !== token.current) return;
      const first = clip.urls[0];
      if (!first) throw new Error("No audio available for this card.");
      const a = new Audio(first);
      audio.current = a;
      a.playbackRate = rate;
      let part = 0;
      let offset = 0;
      a.onplaying = () => { if (my === token.current) { setLoading(false); setPlaying(true); setWord(offset); } };
      a.ontimeupdate = () => {
        if (my === token.current) setWord(offset + playbackWord(clip.texts[part] ?? text, a.currentTime, a.duration));
      };
      a.onended = () => {
        if (my !== token.current) return;
        offset += speechWords(clip.texts[part] ?? "").length;
        part++;
        const next = clip.urls[part];
        if (!next) return stop();
        a.src = next;
        a.playbackRate = rate;
        a.play().catch(fail);
      };
      const fail = (e: unknown) => {
        if (my !== token.current) return;
        stop();
        setError("Audio couldn't start. Tap the speaker to try again.");
        actionError(e, "Could not read this aloud.");
      };
      a.onerror = () => fail(new Error("Audio couldn't load. Try again."));
      await a.play();
    } catch (e) {
      if (my !== token.current) return;
      stop();
      setError("Audio couldn't start. Tap the speaker to try again.");
      actionError(e, "Could not read this aloud.");
    }
  };
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    if (enabled && autoKey !== undefined) void startRef.current();
    return stop;
  }, [text, enabled, autoKey, stop]);
  return { playing, loading, word, error, play: () => playing || loading ? stop() : void start(), stop, dialog };
}