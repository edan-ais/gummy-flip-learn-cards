import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck, Check, X } from "lucide-react";
import { Page, SectionPills } from "@/components/study/Shell";
import { examQuery, useGrade } from "@/lib/exam-data";
import { mastery } from "@/lib/srs";
import { useSettings } from "@/lib/settings";
import { pacedOrder } from "@/lib/pacing";
import { ReadAloud } from "@/lib/read-aloud";
import { chunks } from "@/lib/literacy";

export const Route = createFileRoute("/_authenticated/exam/$examId/practice")({
  component: Practice,
});

function Practice() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { s } = useSettings();
  const grade = useGrade(examId);
  const [section, setSection] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [marked, setMarked] = useState<Record<string, "ok" | "miss">>({});
  const qs = useMemo(
    () => pacedOrder(data.questions.filter((q) => !section || q.section_id === section), data.states, s.spaced, data.pace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, s.spaced],
  );
  const shown = s.adhd ? qs.slice(0, s.chunkSize * 2) : qs;

  return (
    <Page
      eyebrow="Answer first, then check"
      title="Practice"
      action={
        <Link to="/exam/$examId/sample-exam" params={{ examId }} className="gummy-chip">
          <ClipboardCheck size={15} /> Sample exam
        </Link>
      }
    >
      <SectionPills sections={data.sections} value={section} onChange={(v) => (setSection(v), setOpen(null))} />
      <p className="my-4 text-sm text-muted-foreground">
        {qs.length} questions{s.spaced ? " · ones you missed come first" : ""}. Answer aloud or on paper before opening each key.
      </p>
      <ol className="space-y-3" key={section ?? "all"}>
        {shown.map((q, i) => {
          const m = mastery(data.states.get(q.id));
          return (
            <li key={q.id} className="gummy-card p-4 animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="flex gap-3">
                <span className="num-badge" data-m={m}>{i + 1}</span>
                <h3 className="flex-1 font-bold leading-snug">{q.q}</h3>
                <ReadAloud text={q.q} />
              </div>
              <button className="reveal-btn" data-open={open === q.id} onClick={() => setOpen(open === q.id ? null : q.id)} aria-expanded={open === q.id}>
                Check answer <ChevronDown size={16} />
              </button>
              <div className="reveal" data-open={open === q.id}>
                <div>
                  <div className="pt-2 text-sm leading-relaxed">
                    {s.adhd ? (
                      <ul className="answer-chunks">{chunks(q.a).map((x, k) => <li key={k}>{x}</li>)}</ul>
                    ) : (
                      <p>{q.a}</p>
                    )}
                  </div>
                  {marked[q.id] ? (
                    <p className="mt-3 text-sm font-extrabold" data-tone={marked[q.id]}>
                      {marked[q.id] === "ok" ? "Nice! This one moves to review." : "No problem, it'll come back sooner."}
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="gummy-btn" data-variant="again" onClick={() => (grade(q.id, "question", "again"), setMarked({ ...marked, [q.id]: "miss" }))}>
                        <X size={16} /> Missed it
                      </button>
                      <button className="gummy-btn" data-variant="success" onClick={() => (grade(q.id, "question", "good"), setMarked({ ...marked, [q.id]: "ok" }))}>
                        <Check size={16} /> Knew it
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {s.adhd && qs.length > shown.length && <p className="caption mt-4 text-center">Showing a short set. Finish these, then come back for more.</p>}
    </Page>
  );
}
