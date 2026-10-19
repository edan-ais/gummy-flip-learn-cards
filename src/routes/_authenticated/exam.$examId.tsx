import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { examQuery } from "@/lib/exam-data";
import { ExamHeader, ExamTabBar } from "@/components/study/Shell";

export const Route = createFileRoute("/_authenticated/exam/$examId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(examQuery(params.examId)),
  head: () => ({
    meta: [
      { title: "Exam · Study Studio" },
      { name: "description", content: "Flashcards, memory drills, podcasts, practice and notes for this exam." },
      { property: "og:title", content: "Exam · Study Studio" },
      { property: "og:description", content: "Study this exam your way." },
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
    <>
      {!home && <ExamHeader title={data.exam.title} examId={examId} today={data.today} />}
      <Outlet />
      <ExamTabBar examId={examId} />
    </>
  );
}
