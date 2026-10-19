import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ClipboardCheck, RefreshCw, Settings2, Target, Loader2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { actionError } from "@/lib/gems-client";
import { examQuery } from "@/lib/exam-data";
import { mastery } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { processExam } from "@/lib/study.functions";
import { ProgressChip } from "@/components/study/Shell";
import { GemChip, LowBalanceNudge } from "@/lib/gems-client";
import { paceLabel, type PlanKind } from "@/lib/pacing";
import { NotesPanel } from "@/components/study/NotesPanel";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exam/$examId/")({
  head: () => ({
    meta: [
      { title: "Exam overview · StudyLamb" },
      { name: "description", content: "Plan your exam prep and open your StudyLamb study materials." },
      { property: "og:title", content: "Exam overview · StudyLamb" },
      { property: "og:description", content: "Plan your exam prep and open your StudyLamb study materials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExamHome,
});

function ExamHome() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { s, set } = useSettings();
  const qc = useQueryClient();
  const router = useRouter();
  const retry = useServerFn(processExam);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const due = data.cards.filter((c) => {
    const st = data.states.get(c.id);
    return st && new Date(st.due_at) <= now;
  }).length;
  const newCount = data.cards.filter((c) => !data.states.has(c.id)).length;
  const known = data.cards.filter((c) => mastery(data.states.get(c.id)) === "known").length;
  const own = !data.exam.is_sample;

  if (data.exam.status !== "ready")
    return (
      <main className="page">
        <Link to="/courses" className="gummy-icon mb-4" aria-label="Back">
          <ChevronLeft />
        </Link>
        <div className="gummy-card flex flex-col items-center gap-3 py-10 text-center">
          {data.exam.status === "failed" ? <AlertCircle className="text-destructive" size={36} /> : <Loader2 className="animate-spin text-primary" size={36} />}
          <h1 className="text-lg font-extrabold">{data.exam.status === "failed" ? "We couldn't build this study set" : "Building your study set…"}</h1>
          {data.exam.error && (
            <p className="text-sm text-muted-foreground">
              {data.exam.error.includes("NOT_ENOUGH_GEMS") ? (
                <>This needs a few more BrainBucks. <Link to="/gems">Top up</Link>, then tap Try again.</>
              ) : (
                data.exam.error
              )}
            </p>
          )}
          <button
            className="gummy-btn"
            data-variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await retry({ data: { examId } });
              setBusy(false);
              if (!r.ok) actionError(r.error, "We couldn't build this study set.");
              qc.invalidateQueries({ queryKey: ["exam", examId] });
              router.invalidate();
            }}
          >
            <RefreshCw size={16} /> {busy ? "Working…" : "Try again"}
          </button>
        </div>
      </main>
    );

  return (
    <main className="page">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/courses" className="gummy-icon" aria-label="All courses">
          <ChevronLeft />
        </Link>
        <div className="flex items-center gap-2">
          <LowBalanceNudge />
          <GemChip />
          <ProgressChip today={data.today} />
          <Link to="/settings" className="gummy-icon" aria-label="Settings">
            <Settings2 size={18} />
          </Link>
        </div>
      </div>
      <p className="eyebrow">{data.exam.course?.title}</p>
      <h1 className="page-title">{data.exam.title}</h1>
      <PlanCard examId={examId} />

      <Link to="/exam/$examId/cards" params={{ examId }} className="start-btn mt-5 animate-pop">
        <span className="start-play">
          <Play fill="currentColor" />
        </span>
        <span className="text-left">
          <span className="block text-lg font-extrabold">Open flashcards</span>
          <span className="block text-sm opacity-90">
            {s.adhd ? `${s.chunkSize} cards, then a quick break` : due ? `${due} due for review` : `${Math.min(newCount, 10)} new cards`}
          </span>
        </span>
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat n={due} label="Due" tone="primary" />
        <Stat n={newCount} label="New" tone="muted" />
        <Stat n={known} label="Known" tone="success" />
      </div>

      <div className="gummy-card mt-4 flex items-center gap-3 p-4">
        <Target className="text-primary" />
        <div className="flex-1">
          <p className="text-sm font-extrabold">Daily goal</p>
          <p className="text-xs text-muted-foreground">Reviews per day. Pick what feels doable.</p>
        </div>
        <select className="gummy-select" value={s.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })} aria-label="Daily goal">
          {[5, 10, 20, 30, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <Link to="/exam/$examId/sample-exam" params={{ examId }} className="gummy-btn mt-4 w-full">
        <ClipboardCheck size={18} /> Take a sample exam
      </Link>

      {own && (
        <Link to="/exams/new" search={{ examId }} className="gummy-btn mt-4 w-full" data-variant="ghost">
          <Plus size={18} /> Add more materials
        </Link>
      )}
    </main>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="gummy-card p-3" data-tone={tone}>
      <p className="stat-n">{n}</p>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

const KINDS: { v: PlanKind; label: string }[] = [
  { v: "test", label: "Test" },
  { v: "exam", label: "Exam" },
  { v: "homework", label: "Homework" },
];

/** Due date + type. A close date switches to cram mode; a far one spreads new cards into daily sets. */
function PlanCard({ examId }: { examId: string }) {
  const { data } = useSuspenseQuery(examQuery(examId));
  const qc = useQueryClient();
  const savePlan = async (patch: { kind?: PlanKind; due_date?: string | null }) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const next = { ...data.plan, ...patch };
    const { error } = await supabase
      .from("exam_plans")
      .upsert({ user_id: u.user.id, exam_id: examId, kind: next.kind, due_date: next.due_date, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["exam", examId] });
  };
  return (
    <div className="gummy-card mt-4 p-4">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-primary" />
        <p className="flex-1 font-bold">When is it due?</p>
      </div>
      <div className="pill-row mt-3" role="group" aria-label="Type">
        {KINDS.map((k) => (
          <button key={k.v} className="pill" data-active={data.plan.kind === k.v} onClick={() => savePlan({ kind: k.v })}>
            {k.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        className="gummy-input due-date-input mt-3"
        aria-label="Due date"
        value={data.plan.due_date ?? ""}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => savePlan({ due_date: e.target.value || null })}
      />
      <p className="caption mt-2" data-pace={data.pace.mode}>{paceLabel(data.pace)}</p>
    </div>
  );
}
