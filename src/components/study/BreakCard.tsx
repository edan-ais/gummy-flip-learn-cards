import { PartyPopper } from "lucide-react";

const FEEL = [
  ["focused", "😀", "Focused"],
  ["okay", "😐", "Okay"],
  ["distracted", "😵‍💫", "Distracted"],
] as const;

/** ADHD support: short chunks end with a celebration and a quick self-check. */
export function BreakCard({ done, onPick, onContinue }: { done: number; onPick: (v: string) => void; onContinue: () => void }) {
  return (
    <div className="gummy-card flex h-full flex-col items-center justify-center gap-4 text-center animate-pop">
      <PartyPopper size={44} className="text-primary" />
      <h2 className="font-display text-2xl font-bold">Nice! {done} done.</h2>
      <p className="text-sm text-muted-foreground">How was your focus?</p>
      <div className="flex gap-3">
        {FEEL.map(([v, e, l]) => (
          <button key={v} className="feel-btn" onClick={() => onPick(v)}>
            <span className="text-3xl">{e}</span>
            <span className="text-xs font-bold">{l}</span>
          </button>
        ))}
      </div>
      <button className="gummy-btn mt-2 w-full" data-variant="primary" onClick={onContinue}>
        Keep going
      </button>
    </div>
  );
}
