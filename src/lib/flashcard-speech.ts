import { useCallback, useEffect, useRef, useState } from "react";

export function speechWords(text: string) {
  return Array.from(text.matchAll(/\S+/g), (match) => ({ text: match[0], start: match.index ?? 0 }));
}

export function wordAtOffset(text: string, offset: number) {
  const words = speechWords(text);
  return words.findIndex((word, i) => offset >= word.start && offset < (words[i + 1]?.start ?? text.length + 1));
}

/** Device speech supplies word boundaries without creating a paid AI clip. */
export function useFlashcardSpeech(text: string, enabled: boolean, rate: number) {
  const [playing, setPlaying] = useState(false);
  const [word, setWord] = useState(-1);
  const [error, setError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = useCallback(() => {
    if (utterance.current && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utterance.current = null;
    setPlaying(false);
    setWord(-1);
  }, []);

  useEffect(() => {
    stop();
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { stop(); document.removeEventListener("visibilitychange", hide); };
  }, [text, enabled, rate, stop]);

  const play = () => {
    if (playing) return stop();
    if (!enabled) return;
    if (!("speechSynthesis" in window)) {
      setError("Read-aloud isn't available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    utterance.current = speech;
    speech.lang = "en-US";
    speech.rate = rate;
    speech.onstart = () => { setPlaying(true); setWord(0); };
    speech.onboundary = (event) => {
      if (utterance.current === speech && event.name === "word") setWord(wordAtOffset(text, event.charIndex));
    };
    speech.onend = () => { if (utterance.current === speech) stop(); };
    speech.onerror = (event) => {
      if (utterance.current !== speech) return;
      stop();
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Audio couldn't start. Tap to try again.");
    };
    setError("");
    window.speechSynthesis.speak(speech);
  };
  return { playing, word, error, play, stop };
}