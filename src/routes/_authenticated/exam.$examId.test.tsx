import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, RotateCcw, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, SectionPills } from "@/components/study/Shell";
import { examQuery, useGrade } from "@/lib/exam-data";
import { pickExam } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { ReadAloud } from "@/lib/read-aloud";

export const Route = createFileRoute("/_authenticated/exam/$examId/test")({
  component: TestPage,
});

const attemptsQuery = (examId: string) =>
  queryOptions({
    queryKey: ["attempts", examId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", examId)
        .eq("finished", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

type Run = { id: string; ids: string[]; i: number; results: Record<string, boolean>; revealed: boolean; answer: string };

export function scoreOf(results: Record<string, boolean>) {
  const v = Object.values(results);
  return { right: v.filter(Boolean).length, total: v.length };
}

function TestPage() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { data: attempts = [] } = useQuery(attemptsQuery(examId));
  const { s } = useSettings();
  const qc = useQueryClient();
  const grade = useGrade(examId);
  const [count, setCount] = useState(10);
  const [section, setSection] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<Run | null>(null);

  const start = async (ids: string[], retakeOf?: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { data: a, error } = await supabase
      .from("exam_attempts")
      .insert({ user_id: u.user!.id, exam_id: examId, question_ids: ids, retake_of: retakeOf ?? null })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setFinished(null);
    setRun({ id: a.id, ids, i: 0, results: {}, revealed: false, answer: "" });
  };

  const mark = async (ok: boolean) => {
    if (!run) return;
    const qid = run.ids[run.i]!;
    grade(qid, "question", ok ? "good" : "again");
    const results = { ...run.results, [qid]: ok };
    const last = run.i === run.ids.length - 1;
    await supabase.from("exam_attempts").update({ results, finished: last }).eq("id", run.id);
    if (last) {
      setFinished({ ...run, results });
      setRun(null);
      qc.invalidateQueries({ queryKey: ["attempts", examId] });
    } else setRun({ ...run, results, i: run.i + 1, revealed: false, answer: "" });
  };

  if (run) {
    const q = data.questions.find((x) => x.id === run.ids[run.i])!;
    const sc = scoreOf(run.results);
    return (
      <Page eyebrow={`Question ${run.i + 1} of ${run.ids.length}`} title="Sample exam">
        <div className="chunk-dots mb-4">
          {run.ids.map((id, k) => (
            <span key={id} data-on={k < run.i} data-res={run.results[id] === undefined ? undefined : String(run.results[id])} />
          ))}
        </div>
        <div className="gummy-card animate-pop" key={q.id}>
          <div className="flex items-start gap-2">
            <h2 className="card-q mt-0 flex-1 text-lg">{q.q}</h2>
            <ReadAloud text={q.q} />
          </div>
          <textarea
            className="gummy-input mt-2 min-h-28"
            placeholder="Type your answer (optional), or say it out loud"
            value={run.answer}
            onChange={(e) => setRun({ ...run, answer: e.target.value })}
          />
          {run.revealed ? (
            <div className="mt-4 animate-pop">
              <p className="eyebrow">Model answer</p>
              <p className="mt-1 text-sm leading-relaxed">{q.a}</p>
              <p className="mt-4 text-sm font-bold">Did you get it?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="gummy-btn" data-variant="again" onClick={() => mark(false)}>
                  <X size={16} /> Not yet
                </button>
                <button className="gummy-btn" data-variant="success" onClick={() => mark(true)}>
                  <Check size={16} /> Got it
                </button>
              </div>
            </div>
          ) : (
            <button className="gummy-btn mt-4 w-full" data-variant="primary" onClick={() => setRun({ ...run, revealed: true })}>
              Check answer
            </button>
          )}
        </div>
        <p className="caption mt-3 text-center">
          {sc.right} correct so far{s.timers ? "" : " · no time limit"}
        </p>
      </Page>
    );
  }

  if (finished) {
    const sc = scoreOf(finished.results);
    const wrong = finished.ids.filter((id) => finished.results[id] === false);
    const pct = Math.round((sc.right / Math.max(1, sc.total)) * 100);
    return (
      <Page eyebrow="Results" title={`${pct}%`}>
        <div className="gummy-card text-center animate-pop">
          <p className="text-5xl">{pct >= 90 ? "🏆" : pct >= 70 ? "🌟" : "💪"}</p>
          <p className="mt-2 font-extrabold">
            {sc.right} of {sc.total} correct
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {wrong.length ? "Missed questions will come back more often in Cards and Practice." : "Perfect run!"}
          </p>
        </div>
        {wrong.length > 0 && (
          <>
            <button className="gummy-btn mt-4 w-full" data-variant="primary" onClick={() => start(wrong, finished.id)}>
              <RotateCcw size={16} /> Retake the {wrong.length} I got wrong
            </button>
            <ul className="mt-4 space-y-2">
              {wrong.map((id) => {
                const q = data.questions.find((x) => x.id === id)!;
                return (
                  <li key={id} className="gummy-card p-4 text-sm">
                    <p className="font-bold">{q.q}</p>
                    <p className="mt-1 text-muted-foreground">{q.a}</p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button className="gummy-btn mt-4 w-full" data-variant="ghost" onClick={() => setFinished(null)}>
          Done
        </button>
      </Page>
    );
  }

  const pool = data.questions.filter((q) => !section || q.section_id === section);
  return (
    <Page eyebrow="Test yourself" title="Sample exam">
      <SectionPills sections={data.sections} value={section} onChange={setSection} />
      <div className="gummy-card mt-4 space-y-3">
        <p className="font-bold">How many questions?</p>
        <div className="pill-row">
          {[5, 10, 20].map((n) => (
            <button key={n} className="pill" data-active={count === n} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
          <button className="pill" data-active={count === 999} onClick={() => setCount(999)}>
            All
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Questions you've struggled with show up more. No timer.</p>
        <button
          className="gummy-btn w-full"
          data-variant="primary"
          disabled={!pool.length}
          onClick={() => start(pickExam(pool, data.states, Math.min(count, pool.length)).map((q) => q.id))}
        >
          <ClipboardCheck size={18} /> Start exam
        </button>
      </div>
      {attempts.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 font-display text-lg font-bold">Past attempts</h2>
          <ul className="space-y-2">
            {attempts.map((a) => {
              const r = a.results as Record<string, boolean>;
              const sc = scoreOf(r);
              const wrong = a.question_ids.filter((id) => r[id] === false);
              return (
                <li key={a.id} className="exam-row">
                  <span className="flex-1">
                    <b>{Math.round((sc.right / Math.max(1, sc.total)) * 100)}%</b>{" "}
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()} {a.retake_of ? "· retake" : ""}
                    </span>
                  </span>
                  {wrong.length > 0 && (
                    <button className="gummy-chip" onClick={() => start(wrong, a.id)}>
                      <RotateCcw size={13} /> Retake {wrong.length}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
