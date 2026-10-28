import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { GEM_COST, UNITS, extraEpisodeCost, filesCost, parseSteps, processCost, transcriptionCost } from "./gems";

type Sb = { rpc: (fn: "spend_gems", args: { _cost: number; _reason: string }) => PromiseLike<{ error: { message: string } | null }> };

/** Charge gems up front; throws NOT_ENOUGH_GEMS when the wallet is short. */
async function charge(supabase: unknown, cost: number, reason: string) {
  if (cost <= 0) return;
  const { error } = await (supabase as Sb).rpc("spend_gems", { _cost: cost, _reason: reason });
  if (error) throw new Error(error.message.includes("NOT_ENOUGH_GEMS") ? "NOT_ENOUGH_GEMS" : error.message);
}

/** Give gems back when an AI action we charged for didn't finish. */
async function refund(userId: string, cost: number, reason: string) {
  if (cost <= 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("credit_gems", { _user: userId, _amount: cost, _reason: `Refund: ${reason}`, _ref: null as unknown as string });
}

const ParseSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      cards: z.array(z.object({ q: z.string(), a: z.string() })),
      questions: z.array(z.object({ q: z.string(), a: z.string() })),
    }),
  ),
});

const PARSE_PROMPT = `You build study materials for students (often kids and teens, some with dyslexia or ADHD) from their uploaded class materials.
Split the material into its natural sections (chapters, units or topics, 2-10 sections, in the order they appear). Title each like "Ch 4 · Development" when chapters exist.
For every section write:
- summary: one plain sentence.
- cards: 6-20 flashcards covering every key idea, definition, person, stage, and example. Questions are short and specific. Answers are 1-4 short, clear sentences in plain words, faithful to the material. Never invent facts.
- questions: 3-10 exam-style practice questions (explain, compare, apply to an example) with model answers.
Use only facts from the material.
Source-of-truth rules:
- Each block is labeled CHAPTER MATERIAL (textbook, slides, teacher handouts) or STUDENT NOTES (the student's own typed, pasted or spoken notes).
- Chapter material is the source of truth. When student notes contradict it, keep only the version the chapter material supports; never put a contradicted claim in the study guide.
- When the same fact appears in many of the student's notes, treat it as high priority: make sure it is covered by cards and questions, and cover it early.`;

export const processExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { aiText, aiObject, toBase64 } = await import("./ai/gateway.server");
    const { data: exam } = await supabase.from("exams").select("id, owner_id").eq("id", data.examId).single();
    if (!exam || exam.owner_id !== context.userId) throw new Error("Exam not found");
    const { data: mats } = await supabase.from("materials").select("*").eq("exam_id", exam.id).order("created_at");
    // Open files first so bigger files cost more (no AI work yet).
    const blobs = new Map<string, Blob>();
    for (const m of mats ?? []) {
      if (m.extracted_text || !m.storage_path) continue;
      const { data: blob, error } = await supabase.storage.from("materials").download(m.storage_path);
      if (error || !blob) return { ok: false as const, error: `Could not open ${m.name}` };
      blobs.set(m.id, blob);
    }
    const sizes = [...blobs.values()].map((b) => b.size);
    const knownChars = (mats ?? []).reduce((n, m) => n + (m.extracted_text?.length ?? 0), 0);
    const chars = knownChars + sizes.length * 8000;
    let cost = processCost(chars, sizes);
    try {
      await charge(supabase, cost, "Build study set");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      await supabase.from("exams").update({ status: "failed", error: msg }).eq("id", exam.id);
      return { ok: false as const, error: msg };
    }
    await supabase.from("exams").update({ status: "processing", error: null }).eq("id", exam.id);
    try {
      for (const m of mats ?? []) {
        if (m.extracted_text || !m.storage_path) continue;
        const blob = blobs.get(m.id)!;
        const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()));
        const part =
          m.mime === "application/pdf"
            ? { type: "file" as const, filename: m.name, data: b64, mediaType: "application/pdf" }
            : { type: "image" as const, image: new URL(`data:${m.mime};base64,${b64}`) };
        const text = await aiText(
          "Transcribe this study material exactly as written, keeping headings, lists and paragraph breaks. Output plain text only. For handwriting, transcribe faithfully. Do not summarize or add anything.",
          [{ role: "user", content: [part, { type: "text", text: "Transcribe this." }] }],
        );
        await supabase.from("materials").update({ extracted_text: text }).eq("id", m.id);
        m.extracted_text = text;
      }
      const isStudentNotes = (m: { name: string; mime: string }) =>
        m.mime.startsWith("text/") || m.name.startsWith("Pasted notes");
      const { data: myNotes } = await supabase
        .from("personal_notes")
        .select("body")
        .eq("exam_id", exam.id)
        .order("created_at");
      const all =
        (mats ?? [])
          .map((m) => `### ${isStudentNotes(m) ? "STUDENT NOTES" : "CHAPTER MATERIAL"}: ${m.name}\n${m.extracted_text}`)
          .concat((myNotes ?? []).map((n, i) => `### STUDENT NOTES: personal note ${i + 1}\n${n.body}`))
          .join("\n\n");
      if (!all.trim()) throw new Error("No readable text found in the uploads.");
      // Longer than estimated? Charge the extra parse steps before organizing.
      const extra = GEM_COST.parsePer30k * Math.max(0, parseSteps(all.length) - parseSteps(chars));
      if (extra) {
        await charge(supabase, extra, "Build study set (longer material)");
        cost += extra;
      }
      const parsed = await aiObject(PARSE_PROMPT, [{ role: "user", content: all }], ParseSchema);

      // Replace previously generated content
      await supabase.from("podcasts").delete().eq("exam_id", exam.id);
      await supabase.from("cards").delete().eq("exam_id", exam.id);
      await supabase.from("questions").delete().eq("exam_id", exam.id);
      await supabase.from("sections").delete().eq("exam_id", exam.id);
      let cp = 0,
        qp = 0;
      for (const [i, s] of parsed.sections.entries()) {
        const { data: sec, error } = await supabase
          .from("sections")
          .insert({ exam_id: exam.id, position: i, title: s.title, summary: s.summary })
          .select("id")
          .single();
        if (error || !sec) throw error ?? new Error("save failed");
        if (s.cards.length)
          await supabase
            .from("cards")
            .insert(s.cards.map((c) => ({ exam_id: exam.id, section_id: sec.id, position: cp++, q: c.q, a: c.a })));
        if (s.questions.length)
          await supabase
            .from("questions")
            .insert(s.questions.map((c) => ({ exam_id: exam.id, section_id: sec.id, position: qp++, q: c.q, a: c.a })));
        await supabase
          .from("podcasts")
          .insert({ exam_id: exam.id, section_id: sec.id, position: i, title: s.title, detail: s.summary });
      }
      await supabase.from("exams").update({ status: "ready" }).eq("id", exam.id);
      return { ok: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      await refund(context.userId, cost, "Build study set");
      await supabase.from("exams").update({ status: "failed", error: msg }).eq("id", exam.id);
      return { ok: false as const, error: msg };
    }
  });

async function signed(paths: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("audio").createSignedUrls(paths, 60 * 60 * 6);
  return (data ?? []).map((d) => d.signedUrl ?? "").filter(Boolean);
}

export const episodeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { podcastId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: p } = await supabase.from("podcasts").select("*").eq("id", data.podcastId).single();
    if (!p) throw new Error("Episode not found");
    if (p.audio_urls.length) return { urls: p.audio_urls };
    if (p.storage_paths.length) return { urls: await signed(p.storage_paths) };

    const { data: exam } = await supabase.from("exams").select("owner_id").eq("id", p.exam_id).single();
    if (exam?.owner_id !== context.userId) throw new Error("Episode not ready");
    const { aiText, speech, chunkText } = await import("./ai/gateway.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (p.status === "generating") throw new Error("Professor Lamby is already making this episode. Try again shortly — no extra BrainBucks were used.");
    const { data: claimed, error: claimError } = await supabase.from("podcasts")
      .update({ status: "generating" }).eq("id", p.id).neq("status", "generating")
      .eq("storage_paths", []).eq("audio_urls", []).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      const { data: current } = await supabase.from("podcasts").select("audio_urls,storage_paths").eq("id", p.id).single();
      if (current?.audio_urls.length) return { urls: current.audio_urls };
      if (current?.storage_paths.length) return { urls: await signed(current.storage_paths) };
      throw new Error("Professor Lamby is already making this episode. Try again shortly — no extra BrainBucks were used.");
    }
    let charged = false;
    let saved = false;
    let extra = 0;
    try {
      await charge(supabase, GEM_COST.episode, "Abstract episode");
      charged = true;
      if (!p.section_id) throw new Error("This episode needs a chapter first.");
      const { data: cards } = await supabase.from("cards").select("q,a").eq("section_id", p.section_id).order("position");
      const facts = (cards ?? []).map((c) => `Q: ${c.q}\nA: ${c.a}`).join("\n");
      const script = await aiText(
        `Write a short, fun, memorable audio lesson (about 500 words) that a narrator reads aloud. Teach the facts below in a vivid way: a story or scene, analogies, a mnemonic, and 2 quick "pause and recall" questions with the answers given after. Warm, friendly, simple words. Plain text only, no stage directions, no markdown. Use only these facts.`,
        [{ role: "user", content: `Topic: ${p.title}\n${p.detail}\n\n${facts}` }],
      );
      const chunks = chunkText(script);
      extra = extraEpisodeCost(chunks.length);
      if (extra) await charge(supabase, extra, "Abstract episode (longer)");
      const paths: string[] = [];
      for (const [i, c] of chunks.entries()) {
        const wav = await speech(c);
        const path = `episodes/${p.exam_id}/${p.id}/${i}.wav`;
        const { error } = await supabaseAdmin.storage.from("audio").upload(path, wav, { contentType: "audio/wav", upsert: true });
        if (error) throw error;
        paths.push(path);
      }
      const { error: saveError } = await supabase.from("podcasts").update({ script, storage_paths: paths, status: "ready" }).eq("id", p.id);
      if (saveError) throw saveError;
      saved = true;
      return { urls: await signed(paths) };
    } catch (e) {
      if (!saved) {
        await supabase.from("podcasts").update({ status: "empty" }).eq("id", p.id);
        if (charged) await refund(context.userId, GEM_COST.episode + extra, "Abstract episode");
      }
      throw e;
    }
  });

async function sha(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Read text aloud. Audio is cached so repeat listens are free. */
export const speak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; quoteOnly?: boolean }) => ({ text: String(d.text), quoteOnly: !!d.quoteOnly }))
  .handler(async ({ data, context }) => {
    const { speech, chunkText } = await import("./ai/gateway.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const chunks = chunkText(data.text, 1200);
    const paths: string[] = [];
    const missing = new Set<string>();
    for (const c of chunks) {
      const name = `${await sha(c)}.wav`;
      const path = `tts/${name}`;
      const { data: hits, error } = await supabaseAdmin.storage.from("audio").list("tts", { search: name, limit: 1 });
      if (error) throw error;
      if (!hits?.some((hit) => hit.name === name)) missing.add(path);
    }
    // Only new clips cost gems; anything already voiced is free to replay.
    const cost = missing.size * GEM_COST.speechClip;
    if (data.quoteOnly) return { urls: [] as string[], texts: chunks, cost };
    await charge(context.supabase, cost, "Read aloud");
    try {
      for (const c of chunks) {
      const path = `tts/${await sha(c)}.wav`;
      if (missing.has(path)) {
        const wav = await speech(c);
        const { error } = await supabaseAdmin.storage.from("audio").upload(path, wav, { contentType: "audio/wav", upsert: true });
        if (error) throw error;
      }
        paths.push(path);
      }
      return { urls: await signed(paths), texts: chunks, cost };
    } catch (e) {
      await refund(context.userId, cost, "Read aloud");
      throw e;
    }
  });

const SyllabusSchema = z.object({
  classes: z.array(
    z.object({
      title: z.string(),
      exams: z.array(z.object({ title: z.string(), date: z.string().nullable() })),
    }),
  ),
});

/** Read a syllabus and create the classes and major exams it lists. */
export const processSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; mime: string; text?: string; path?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { aiText, aiObject, toBase64 } = await import("./ai/gateway.server");
    const needsRead = !data.text && !!data.path;
    let blob: Blob | null = null;
    if (needsRead && data.path) {
      const r = await supabase.storage.from("materials").download(data.path);
      if (r.error || !r.data) throw new Error("Could not open that file.");
      blob = r.data;
    }
    let cost = GEM_COST.parseBase + GEM_COST.parsePer30k * Math.max(0, parseSteps((data.text ?? "").length) - 1) + (blob ? filesCost([blob.size]) : 0);
    await charge(supabase, cost, "Read syllabus");
    try {
      let text = data.text ?? "";
      if (blob) {
        const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()));
        const part =
          data.mime === "application/pdf"
            ? { type: "file" as const, filename: data.name, data: b64, mediaType: "application/pdf" }
            : { type: "image" as const, image: new URL(`data:${data.mime};base64,${b64}`) };
        text = await aiText("Transcribe this syllabus exactly as written. Plain text only.", [
          { role: "user", content: [part, { type: "text", text: "Transcribe this." }] },
          ]);
      }
      if (!text.trim()) throw new Error("No readable text found in that syllabus.");
      const parsed = await aiObject(
        `Read this school syllabus and list the class and its major exams (tests, quizzes, midterms, finals — not homework or readings). Return one class per syllabus. Exam titles short and clear, dates as YYYY-MM-DD when stated, else null.`,
        [{ role: "user", content: text }],
        SyllabusSchema,
      );
      const created: { courseId: string; exams: number }[] = [];
      for (const c of parsed.classes.slice(0, 8)) {
        const { data: course, error } = await supabase
          .from("courses")
          .insert({ title: c.title.slice(0, 80), owner_id: context.userId, color: "sky" })
          .select("id")
          .single();
        if (error || !course) throw error ?? new Error("save failed");
        let n = 0;
        for (const e of (c.exams ?? []).slice(0, 20)) {
          const { error: e2 } = await supabase.from("exams").insert({
            course_id: course.id,
            owner_id: context.userId,
            title: e.title.slice(0, 120),
            status: "ready",
            exam_date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : null,
          });
          if (!e2) n++;
        }
        created.push({ courseId: course.id, exams: n });
      }
      if (!created.length) throw new Error("No classes found in that syllabus.");
      return { ok: true as const, created };
    } catch (e) {
      await refund(context.userId, cost, "Read syllabus");
      throw e;
    }
  });

/** Combine every exam from the chosen classes into one final-review exam. Free — no AI needed. */
export const buildFinalReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.courseIds.length) throw new Error("Pick at least one class.");
    const { data: courses } = await supabase.from("courses").select("id,title,owner_id").in("id", data.courseIds);
    const owned = (courses ?? []).filter((c) => c.owner_id === context.userId);
    if (!owned.length) throw new Error("Classes not found");
    const { data: exams } = await supabase.from("exams").select("id").in("course_id", owned.map((c) => c.id));
    const examIds = (exams ?? []).map((e) => e.id);
    const { data: course, error } = await supabase
      .from("courses")
      .insert({ title: "Final review", owner_id: context.userId, color: "grape" })
      .select("id")
      .single();
    if (error || !course) throw error ?? new Error("save failed");
    const { data: exam, error: e2 } = await supabase
      .from("exams")
      .insert({ course_id: course.id, owner_id: context.userId, title: `Final · ${owned.map((c) => c.title).join(" + ")}`.slice(0, 120), status: "ready" })
      .select("id")
      .single();
    if (e2 || !exam) throw e2 ?? new Error("save failed");
    if (examIds.length) {
      const { data: cards } = await supabase.from("cards").select("q,a,position").in("exam_id", examIds).order("position");
      const { data: questions } = await supabase.from("questions").select("q,a,position").in("exam_id", examIds).order("position");
      if (cards?.length)
        await supabase.from("cards").insert(cards.map((c, i) => ({ exam_id: exam.id, section_id: null, position: i, q: c.q, a: c.a })));
      if (questions?.length)
        await supabase.from("questions").insert(questions.map((q, i) => ({ exam_id: exam.id, section_id: null, position: i, q: q.q, a: q.a })));
    }
    return { examId: exam.id };
  });

export const transcribeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audio: string; mime: string }) => {
    return d;
  })
  .handler(async ({ data, context }) => {
    const { transcribe, fromBase64 } = await import("./ai/gateway.server");
    await charge(context.supabase, transcriptionCost(data.audio.length), "Spoken note");
    const text = await transcribe(fromBase64(data.audio), data.mime.split(";")[0] || "audio/webm");
    return { text };
  });
