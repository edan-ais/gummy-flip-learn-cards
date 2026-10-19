import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { Page } from "@/components/study/Shell";
import { CARDS, CHAPTERS, LABELS } from "@/lib/study";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes · Psychology Study Studio" },
      { name: "description", content: "Organized Exam 2 concept notebooks, corrections and source coverage." },
      { property: "og:title", content: "Notes · Psychology Study Studio" },
      { property: "og:description", content: "Your Exam 2 notes, organized by chapter." },
    ],
  }),
  component: Notes,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="gummy-card p-0 overflow-hidden">
      <button className="flex w-full items-center justify-between p-4 text-left font-bold" onClick={() => setOpen(!open)} aria-expanded={open}>
        {title}
        <ChevronDown size={18} className="chev" data-open={open} />
      </button>
      <div className="reveal" data-open={open}>
        <div>
          <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

const Q = [
  ["Development set 1", "https://quizlet.com/830417288/chapter-4-inquizitive-development-across-the-life-span-flash-cards/"],
  ["Development set 2", "https://quizlet.com/156758703/py-101-ch-4-flash-cards/"],
  ["Learning set", "https://quizlet.com/869912989/chapter-6-learning-chapter-6-psychology-inquizitive-qa-psychology-in-your-life-1-7-flash-cards/"],
  ["Memory set", "https://quizlet.com/679631845/chapter-7-memory-flash-cards/"],
];

function Notes() {
  return (
    <Page eyebrow="Organized" title="Your notes">
      <p className="mb-4 text-sm text-muted-foreground">
        The 36-page Exam 2 guide is primary. The 2-page class notes add emphasis. The guide's memory heading says
        Chapter 17; we use Ch 7 Memory for this exam.
      </p>
      <div className="note-alert mb-4">
        <h3 className="flex items-center gap-2 font-bold">
          <AlertCircle size={18} /> Corrections applied
        </h3>
        <p className="mt-1 text-sm">
          There is no blanket guaranteed-safe first-two-week rule for alcohol or smoking. Teratogen effects depend on
          amount, duration and developmental stage. Iconic memory lasts a fraction of a second; echoic memory lasts
          several seconds.
        </p>
        <div className="mt-2 flex flex-col gap-1 text-sm font-semibold">
          <a href="https://www.cdc.gov/fasd/about/index.html" target="_blank" rel="noopener noreferrer">CDC: prenatal alcohol exposure</a>
          <a href="https://www.cdc.gov/tobacco/about/cigarettes-and-reproductive-health.html" target="_blank" rel="noopener noreferrer">CDC: smoking and pregnancy</a>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        The assigned Yanjaa video is not included in the supplied files. Watch it for the exact demonstrations. This
        is practice, not a guarantee of the test's questions.
      </p>
      <div className="space-y-3">
        <Section title="Source coverage and supplement limits">
          <p>
            All guide topics are represented. The four named Quizlet pages were checked. Three sets exposed all 14, 36
            and 15 entries. The 248-card learning set exposed 15 entries before a security challenge blocked full
            access. Only verified concepts were included. Conflicting and oversimplified supplemental answers were
            reconciled to the guide, not copied blindly.
          </p>
          {Q.map(([l, h]) => (
            <a key={h} href={h} target="_blank" rel="noopener noreferrer" className="block font-semibold text-primary">
              {l}
            </a>
          ))}
        </Section>
        {CHAPTERS.map((ch) => (
          <Section key={ch} title={`${LABELS[ch]} · concept notebook`}>
            {CARDS.filter((c) => c.chapter === ch).map((c) => (
              <section key={c.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <h4 className="font-bold">{c.q}</h4>
                <p className="mt-1 text-muted-foreground">{c.a}</p>
              </section>
            ))}
          </Section>
        ))}
      </div>
      <p className="caption mt-6 text-center">
        Built from the supplied Exam 2 guide and class notes. Drawings and learned marks stay on this device.
      </p>
    </Page>
  );
}
