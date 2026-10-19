import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speechWords } from "@/lib/flashcard-speech";

export function FlashcardAudioButton({ playing, play }: { playing: boolean; play: () => void }) {
  return <Button type="button" variant="ghost" size="icon" className="gummy-icon sm shrink-0" aria-label={playing ? "Stop flashcard audio" : "Read flashcard aloud"} onClick={(event) => { event.stopPropagation(); play(); }}>
    {playing ? <Square /> : <Volume2 />}
  </Button>;
}

export function SpokenWords({ text, current }: { text: string; current: number }) {
  const words = speechWords(text);
  return <>{words.map((word, i) => <span key={`${word.start}-${word.text}`}><span className="spoken-word" data-current={i === current}>
    {i === current && <span key={i} className="reading-ball" aria-hidden="true" />}{word.text}
  </span>{i < words.length - 1 ? " " : ""}</span>)}</>;
}