import { Link, useLocation } from "@tanstack/react-router";
import { Layers, Brain, Headphones, PenLine, BookOpen, Play, Pause } from "lucide-react";
import type { ReactNode } from "react";
import { usePlayer, TRACKS } from "@/lib/player";
import cover from "@/assets/cover.jpg.asset.json";
import { LABELS, CHAPTERS } from "@/lib/study";

const TABS = [
  { to: "/", label: "Cards", icon: Layers },
  { to: "/memorize", label: "Memorize", icon: Brain },
  { to: "/podcast", label: "Podcast", icon: Headphones },
  { to: "/practice", label: "Practice", icon: PenLine },
  { to: "/notes", label: "Notes", icon: BookOpen },
] as const;

export function TabBar() {
  const { pathname } = useLocation();
  const dark = pathname === "/podcast";
  return (
    <nav className={dark ? "tabbar tabbar-dark" : "tabbar"} aria-label="Study sections">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} className="tab" data-active={active} aria-current={active ? "page" : undefined}>
            <span className="tab-icon">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MiniPlayer() {
  const p = usePlayer();
  const { pathname } = useLocation();
  if (!p.started || pathname === "/podcast") return null;
  const t = TRACKS[p.track]!;
  return (
    <div className="mini-player">
      <Link to="/podcast" className="flex min-w-0 flex-1 items-center gap-3">
        <img src={cover.url} alt="" className="h-10 w-10 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{t.title}</p>
          <p className="truncate text-xs text-muted-foreground">{LABELS[t.ch]}</p>
        </div>
      </Link>
      <button className="gummy-icon" onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"}>
        {p.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <span className="mini-progress" style={{ width: `${(p.time / (p.duration || 1)) * 100}%` }} />
    </div>
  );
}

export function Page({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <main className="page">
      <header className="mb-5 animate-rise">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
      </header>
      {children}
    </main>
  );
}

export function ChapterPills({ value, onChange }: { value?: number; onChange: (n: number) => void }) {
  return (
    <div className="pill-row">
      {CHAPTERS.map((n) => (
        <button key={n} className="pill" data-active={value === n} onClick={() => onChange(n)}>
          Ch {n}
        </button>
      ))}
    </div>
  );
}
