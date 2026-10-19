import { Link, useLocation, useParams } from "@tanstack/react-router";
import { Layers, Brain, Headphones, PenLine, Play, Pause, ChevronLeft, Settings2, Loader2, Home, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import { usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";

const TABS = [
  { to: "/exam/$examId", label: "Home", icon: Home },
  { to: "/exam/$examId/podcast", label: "Listen", icon: Headphones },
  { to: "/exam/$examId/cards", label: "Cards", icon: Layers },
  { to: "/exam/$examId/memorize", label: "Memorize", icon: Brain },
  { to: "/exam/$examId/practice", label: "Practice", icon: PenLine },
] as const;

export function ExamTabBar({ examId }: { examId: string }) {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Study sections">
      {TABS.map(({ to, label, icon: Icon }) => {
        const path = to.replace("$examId", examId);
        const active = label === "Home" ? pathname.replace(/\/$/, "") === path : pathname.startsWith(path) || (label === "Practice" && pathname.endsWith("/sample-exam"));
        return (
          <Link key={to} to={to} params={{ examId }} className="tab" data-active={active}>
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
  const params = useParams({ strict: false }) as { examId?: string };
  if (!p.started || !p.current || pathname.endsWith("/podcast")) return null;
  return (
    <div className="mini-player" data-tabs={!!params.examId}>
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
        <span className="mini-art">
          <Headphones size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{p.current.title}</p>
          <p className="truncate text-xs text-muted-foreground">{p.current.subtitle}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="gummy-icon shrink-0" onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"}>
        {p.loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : p.playing ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </Button>
      <Button variant="ghost" size="icon" className="gummy-icon sm shrink-0" onClick={p.close} aria-label="Close podcast player" title="Close podcast player"><X size={18} /></Button>
      <span className="mini-progress" style={{ width: `${(p.time / (p.duration || 1)) * 100}%` }} />
    </div>
  );
}

/** Daily goal bar + optional session timer (timers are off by default). */
export function ProgressChip({ today }: { today: number }) {
  const { s } = useSettings();
  const pct = Math.min(1, today / Math.max(1, s.dailyGoal));
  return (
    <div className="goal-chip" aria-label={`${today} of ${s.dailyGoal} reviews today`}>
      <svg viewBox="0 0 36 36" width="22" height="22" aria-hidden>
        <circle cx="18" cy="18" r="15" className="goal-track" />
        <circle cx="18" cy="18" r="15" className="goal-fill" strokeDasharray={`${pct * 94.2} 94.2`} />
      </svg>
      <span>
        {today}/{s.dailyGoal}
      </span>
      {s.timers && <Timer />}
    </div>
  );
}

function Timer() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="ml-1 tabular-nums text-muted-foreground">
      · {Math.floor(t / 60)}:{String(t % 60).padStart(2, "0")}
    </span>
  );
}

export function ExamHeader({ title, examId, today }: { title: string; examId: string; today: number }) {
  return (
    <header className="exam-header">
      <Link to="/exam/$examId" params={{ examId }} className="gummy-icon sm" aria-label="Exam home">
        <ChevronLeft size={18} />
      </Link>
      <p className="min-w-0 flex-1 truncate text-sm font-extrabold">{title}</p>
      <ProgressChip today={today} />
      <Link to="/settings" className="gummy-icon sm" aria-label="Settings">
        <Settings2 size={16} />
      </Link>
    </header>
  );
}

export function Page({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="page">
      <header className="page-heading mb-5 grid min-w-0 gap-3 animate-rise">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}

export function SectionPills<T extends { id: string; title: string }>({
  sections,
  value,
  onChange,
  all = true,
}: {
  sections: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  all?: boolean;
}) {
  return (
    <div className="pill-row scroll-x">
      {all && (
        <button className="pill" data-active={value === null} onClick={() => onChange(null)}>
          All
        </button>
      )}
      {sections.map((s) => (
        <button key={s.id} className="pill" data-active={value === s.id} onClick={() => onChange(s.id)}>
          {(s.title.split("·")[0] ?? s.title).trim()}
        </button>
      ))}
    </div>
  );
}
