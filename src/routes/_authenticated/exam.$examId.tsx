import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { examQuery } from "@/lib/exam-data";
import { ExamHeader, ExamTabBar } from "@/components/study/Shell";

export const Route = createFileRoute("/_authenticated/exam/$examId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(examQuery(params.examId)),
  head: () => ({
    meta: [
      { title: "Exam · StudyLamb" },
      { name: "description", content: "Flashcards, memory drills, podcasts, practice and notes for this exam." },
      { property: "og:title", content: "Exam · StudyLamb" },
      { property: "og:description", content: "Study this exam your way." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExamLayout,
});

function ExamLayout() {
  const { examId } = Route.useParams();
  const { data } = useSuspenseQuery(examQuery(examId));
  const { pathname } = useLocation();
  const home = pathname.replace(/\/$/, "").endsWith(examId);
  return (
    <div className="exam-layout" data-home={home}>
      {!home && <ExamHeader title={data.exam.title} examId={examId} today={data.today} />}
      <Outlet />
      <ExamTabBar examId={examId} title={data.exam.title} />
    </div>
  );
}
