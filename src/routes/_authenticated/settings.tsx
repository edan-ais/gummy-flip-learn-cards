import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/study/Shell";
import { useSettings, type Settings } from "@/lib/settings";
import { syllables } from "@/lib/literacy";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings · StudyLamb" },
      { name: "description", content: "Learning supports: dyslexia, ADHD, read-aloud, spaced repetition, fonts and speed." },
      { property: "og:title", content: "Settings · StudyLamb" },
      { property: "og:description", content: "Make studying work for how you learn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { s, set } = useSettings();
  const router = useRouter();
  return (
    <Page
      eyebrow="Make it yours"
      title="Settings"
      action={
        <button className="gummy-icon" onClick={() => router.history.back()} aria-label="Back">
          <ChevronLeft />
        </button>
      }
    >
      <Group title="Learning supports">
        <Toggle k="spaced" label="Spaced repetition" desc="Things you know well become quick review. Things you're struggling with come back more often." />
        <Toggle k="readAloud" label="Read-aloud" desc="Adds a speaker button to cards, questions and notes. The text always stays on screen." />
        <Toggle k="dyslexia" label="Dyslexia support" desc="Readable font and spacing, syllable chunks, sound-letter and spelling patterns, and a guided Word lab with instant feedback." />
        <Toggle k="adhd" label="ADHD support" desc="Short chunks with breaks, answers split into bite-size bullets, chunk progress dots, and a quick focus check-in." />
        <Toggle k="timers" label="Show timers" desc="Off by default. Shows how long you've been studying." />
      </Group>

      <Group title="Goals">
        <Range label="Daily goal" value={s.dailyGoal} min={5} max={60} step={5} fmt={(v) => `${v} reviews`} onChange={(v) => set({ dailyGoal: v })} />
        <Range label="Chunk size (ADHD)" value={s.chunkSize} min={3} max={10} step={1} fmt={(v) => `${v} cards`} onChange={(v) => set({ chunkSize: v })} />
      </Group>

      <Group title="Text">
        <div className="seg">
          {(["rounded", "lexend"] as const).map((f) => (
            <button key={f} data-active={s.font === f} onClick={() => set({ font: f })} style={{ fontFamily: f === "lexend" ? "Lexend" : undefined }}>
              {f === "rounded" ? "Rounded" : "Lexend (easy read)"}
            </button>
          ))}
        </div>
        <Range label="Text size" value={s.fontScale} min={0.9} max={1.5} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ fontScale: v })} />
        <Range label="Letter spacing" value={s.letterSpacing} min={0} max={0.15} step={0.01} fmt={(v) => (v ? `+${Math.round(v * 100)}` : "Normal")} onChange={(v) => set({ letterSpacing: v })} />
        <Range label="Line spacing" value={s.lineHeight} min={1.3} max={2.4} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => set({ lineHeight: v })} />
        <div className="preview-text">
          <p>Assimilation fits new experiences into an existing schema.</p>
          {s.dyslexia && (
            <p className="mt-2 flex flex-wrap gap-1">
              {syllables("assimilation").map((p, i) => (
                <span key={i} className="syl" data-alt={i % 2 === 1}>{p}</span>
              ))}
            </p>
          )}
        </div>
      </Group>

      <Group title="Audio">
        <Range label="Listening speed" value={s.speechRate} min={0.75} max={1.75} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ speechRate: v })} />
      </Group>

      <p className="mt-8 text-center text-xs font-bold text-muted-foreground">Powered by waiwiser</p>
    </Page>
  );

  function Toggle({ k, label, desc }: { k: keyof Settings; label: string; desc: string }) {
    const on = Boolean(s[k]);
    return (
      <button className="setting-row" role="switch" aria-checked={on} onClick={() => set({ [k]: !on } as Partial<Settings>)}>
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-extrabold">{label}</span>
          <span className="block text-sm text-muted-foreground">{desc}</span>
        </span>
        <span className="switch" data-on={on} />
      </button>
    );
  }
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="gummy-card space-y-4 p-4">{children}</div>
    </section>
  );
}

function Range(p: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-extrabold">
        {p.label} <span className="text-muted-foreground">{p.fmt(p.value)}</span>
      </span>
      <input type="range" className="gummy-range mt-2 w-full" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </label>
  );
}
