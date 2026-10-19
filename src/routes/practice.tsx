import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Page, ChapterPills } from "@/components/study/Shell";
import { EXAMS, LABELS } from "@/lib/study";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice · Psychology Study Studio" },
      { name: "description", content: "Exam-style practice questions for Ch 4, 6 and 7 with hidden answer keys." },
      { property: "og:title", content: "Practice · Psychology Study Studio" },
      { property: "og:description", content: "Practice without peeking. Exam 2 question bank." },
    ],
  }),
  component: Practice,
});

function Practice() {
  const [ch, setCh] = useState(4);
  const [open, setOpen] = useState<number | null>(null);
  const qs = EXAMS.filter((q) => q.chapter === ch);
  return (
    <Page eyebrow="No peeking" title="Practice">
      <ChapterPills value={ch} onChange={(n) => (setCh(n), setOpen(null))} />
      <p className="my-4 text-sm text-muted-foreground">
        {LABELS[ch]} · {qs.length} questions. Answer aloud or on paper before opening each key.
      </p>
      <ol className="space-y-3" key={ch}>
        {qs.map((q, i) => (
          <li key={i} className="gummy-card p-4 animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <div className="flex gap-3">
              <span className="num-badge">{i + 1}</span>
              <h3 className="font-bold leading-snug">{q.q}</h3>
            </div>
            <button
              className="reveal-btn"
              data-open={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              Check answer <ChevronDown size={16} />
            </button>
            <div className="reveal" data-open={open === i}>
              <div>
                <p className="pt-2 text-sm leading-relaxed">{q.a}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Page>
  );
}
