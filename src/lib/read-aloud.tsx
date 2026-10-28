import { Volume2, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlashcardSpeech } from "./flashcard-speech";
import { useSettings } from "./settings";

/** Read-aloud button. Shown only when the Read-aloud setting is on; text always stays on screen. */
export function ReadAloud({ text, className = "" }: { text: string; className?: string }) {
  const { s } = useSettings();
  const speech = useFlashcardSpeech(text, s.readAloud, s.speechRate);
  if (!s.readAloud) return null;

  return (
    <><Button variant="ghost" size="icon"
      type="button"
      className={`gummy-icon sm ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        speech.play();
      }}
      aria-label={speech.playing || speech.loading ? "Stop reading" : "Read aloud"}
    >
      {speech.loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : speech.playing ? (
        <Square size={14} fill="currentColor" />
      ) : (
        <Volume2 size={16} />
      )}
    </Button>{speech.dialog}</>
  );
}
