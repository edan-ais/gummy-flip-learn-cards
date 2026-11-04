import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SCRIPT_MIME, SCRIPT_SOURCE, scriptPassages } from "./scripts";

/** Saving literal script text uses no AI and costs no BrainBucks. */
export const saveScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { examId: string; courseId: string; title: string; text: string }) =>
    z.object({ examId: z.string().uuid(), courseId: z.string().uuid(), title: z.string().trim().min(1), text: z.string().refine((s) => s.trim().length > 0) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const check = (error: unknown) => { if (error) throw new Error("Your script couldn't be saved. Please try again."); };
    const { data: existing, error: readError } = await sb.from("exams").select("owner_id,course_id").eq("id", data.examId).maybeSingle();
    check(readError);
    if (existing && (existing.owner_id !== context.userId || existing.course_id !== data.courseId)) throw new Error("Script not found.");
    if (existing) {
      const { data: material } = await sb.from("materials").select("mime").eq("exam_id", data.examId);
      if (!material?.some((m) => m.mime === SCRIPT_MIME)) throw new Error("This is not a script.");
    }
    if (!existing) {
      check((await sb.from("courses").upsert({ id: data.courseId, owner_id: context.userId, title: data.title, color: "sky" })).error);
      check((await sb.from("exams").insert({ id: data.examId, course_id: data.courseId, owner_id: context.userId, title: data.title, status: "processing" })).error);
      check((await sb.from("materials").insert({ exam_id: data.examId, name: "Original script", mime: SCRIPT_MIME, extracted_text: data.text })).error);
    }
    check((await sb.from("exams").update({ title: data.title, status: "processing" }).eq("id", data.examId)).error);
    check((await sb.from("materials").update({ extracted_text: data.text }).eq("exam_id", data.examId).eq("mime", SCRIPT_MIME)).error);
    const { data: oldCards, error: cardsError } = await sb.from("cards").select("id,a,position").eq("exam_id", data.examId).order("position");
    check(cardsError);
    const passages = scriptPassages(data.text);
    const cards = passages.map((a, position) => ({ id: oldCards?.find((c) => c.position === position && c.a === a)?.id ?? crypto.randomUUID(), exam_id: data.examId, section_id: null, position, q: `Passage ${position + 1}`, a, source: SCRIPT_SOURCE }));
    check((await sb.from("cards").upsert(cards)).error);
    const stale = (oldCards ?? []).filter((c) => !cards.some((next) => next.id === c.id)).map((c) => c.id);
    if (stale.length) {
      check((await sb.from("review_state").delete().eq("exam_id", data.examId).in("item_id", stale)).error);
      check((await sb.from("cards").delete().eq("exam_id", data.examId).in("id", stale)).error);
    }
    check((await sb.from("exams").update({ status: "ready", error: null }).eq("id", data.examId)).error);
    return { examId: data.examId };
  });