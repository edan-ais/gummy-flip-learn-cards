import { useRef, useState } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { actionError } from "@/lib/gems-client";
import { speak } from "./study.functions";
import { useSettings } from "./settings";

const cache = new Map<string, string[]>();
let active: HTMLAudioElement | null = null;

/** Read-aloud button. Shown only when the Read-aloud setting is on; text always stays on screen. */
export function ReadAloud({ text, className = "" }: { text: string; className?: string }) {
  const { s } = useSettings();
  const fn = useServerFn(speak);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const el = useRef<HTMLAudioElement | null>(null);
  if (!s.readAloud) return null;

  const stop = () => {
    el.current?.pause();
    setState("idle");
  };
  const play = async () => {
    if (state === "playing") return stop();
    active?.pause();
    setState("loading");
    try {
      const urls = cache.get(text) ?? (await fn({ data: { text } })).urls;
      cache.set(text, urls);
      let i = 0;
      const a = new Audio(urls[0]);
      a.playbackRate = s.speechRate;
      a.onended = () => {
        i++;
        if (i < urls.length) {
          a.src = urls[i]!;
          a.playbackRate = s.speechRate;
          a.play();
        } else setState("idle");
      };
      a.onpause = () => a.ended || setState("idle");
      el.current = a;
      active = a;
      await a.play();
      setState("playing");
    } catch (e) {
      setState("idle");
      actionError(e, "Could not read this aloud.");
    }
  };
  return (
    <button
      type="button"
      className={`gummy-icon sm ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        play();
      }}
      aria-label={state === "playing" ? "Stop reading" : "Read aloud"}
    >
      {state === "loading" ? (
        <Loader2 size={16} className="animate-spin" />
      ) : state === "playing" ? (
        <Square size={14} fill="currentColor" />
      ) : (
        <Volume2 size={16} />
      )}
    </button>
  );
}
