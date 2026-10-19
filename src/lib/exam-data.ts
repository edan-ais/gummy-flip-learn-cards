import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import sampleCards from "@/data/sample-cards.json";
import sampleQuestions from "@/data/sample-questions.json";
import sampleNotes from "@/data/sample-notes.txt?raw";
import { schedule, type Grade, type ReviewState } from "./srs";

export type Card = Pick<Tables<"cards">, "id" | "exam_id" | "section_id" | "position" | "q" | "a" | "source">;
export type Question = Pick<Tables<"questions">, "id" | "exam_id" | "section_id" | "position" | "q" | "a">;
export type Section = Tables<"sections">;
export type Podcast = Tables<"podcasts">;
export type Material = Tables<"materials">;

export type ExamBundle = {
  exam: Tables<"exams"> & { course: { title: string; color: string } | null };
  sections: Section[];
  cards: Card[];
  questions: Question[];
  podcasts: Podcast[];
  materials: Material[];
  states: Map<string, ReviewState>;
  today: number;
};

const must = <T>(r: { data: T | null; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const examQuery = (examId: string) =>
  queryOptions({
    queryKey: ["exam", examId],
    queryFn: async (): Promise<ExamBundle> => {
      const exam = must(
        await supabase.from("exams").select("*, course:courses(title,color)").eq("id", examId).single(),
      ) as ExamBundle["exam"];
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [sections, podcasts, materials, rs, ev, cards, questions] = await Promise.all([
        supabase.from("sections").select("*").eq("exam_id", examId).order("position").then(must),
        supabase.from("podcasts").select("*").eq("exam_id", examId).order("position").then(must),
        exam.is_sample
          ? Promise.resolve<Material[]>([
              {
                id: "sample-notes",
                exam_id: examId,
                name: "Exam 2 guide + class notes",
                mime: "text/plain",
                storage_path: null,
                extracted_text: sampleNotes,
                created_at: exam.created_at,
              },
            ])
          : supabase.from("materials").select("*").eq("exam_id", examId).order("created_at").then(must),
        supabase.from("review_state").select("*").eq("exam_id", examId).then(must),
        supabase
          .from("study_events")
          .select("id", { count: "exact", head: true })
          .eq("exam_id", examId)
          .eq("kind", "review")
          .gte("created_at", start.toISOString()),
        exam.is_sample
          ? Promise.resolve(sampleCards as Card[])
          : supabase.from("cards").select("*").eq("exam_id", examId).order("position").then(must),
        exam.is_sample
          ? Promise.resolve(sampleQuestions as Question[])
          : supabase.from("questions").select("*").eq("exam_id", examId).order("position").then(must),
      ]);
      return {
        exam,
        sections: sections as Section[],
        podcasts: podcasts as Podcast[],
        materials: materials as Material[],
        cards: cards as Card[],
        questions: questions as Question[],
        states: new Map((rs as ReviewState[]).map((r) => [r.item_id, r])),
        today: ev.count ?? 0,
      };
    },
  });

/** Record a review: updates spaced repetition and today's progress. */
export function useGrade(examId: string) {
  const qc = useQueryClient();
  return async (itemId: string, kind: "card" | "question" | "memorize", grade: Grade) => {
    const key = examQuery(examId).queryKey;
    const b = qc.getQueryData<ExamBundle>(key);
    const next = schedule(b?.states.get(itemId), itemId, grade);
    if (b) {
      const states = new Map(b.states);
      states.set(itemId, next);
      qc.setQueryData(key, { ...b, states, today: b.today + 1 });
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await Promise.all([
      supabase.from("review_state").upsert({
        ...next,
        user_id: u.user.id,
        exam_id: examId,
        kind,
        updated_at: new Date().toISOString(),
      }),
      supabase.from("study_events").insert({ user_id: u.user.id, exam_id: examId, kind: "review", value: grade }),
    ]);
  };
}

export async function logEvent(examId: string, kind: string, value: string) {
  const { data: u } = await supabase.auth.getUser();
  if (u.user) await supabase.from("study_events").insert({ user_id: u.user.id, exam_id: examId, kind, value });
}
