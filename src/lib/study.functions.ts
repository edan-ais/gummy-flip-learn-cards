import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
Use only facts from the material.`;

export const processExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { aiText, aiObject, toBase64 } = await import("./ai/gateway.server");
    const { data: exam } = await supabase.from("exams").select("id, owner_id").eq("id", data.examId).single();
    if (!exam || exam.owner_id !== context.userId) throw new Error("Exam not found");
    await supabase.from("exams").update({ status: "processing", error: null }).eq("id", exam.id);
    try {
      const { data: mats } = await supabase.from("materials").select("*").eq("exam_id", exam.id).order("created_at");
      for (const m of mats ?? []) {
        if (m.extracted_text || !m.storage_path) continue;
        const { data: blob, error } = await supabase.storage.from("materials").download(m.storage_path);
        if (error || !blob) throw new Error(`Could not open ${m.name}`);
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
      const all = (mats ?? [])
        .map((m) => `### ${m.name}\n${m.extracted_text}`)
        .join("\n\n")
        .slice(0, 150_000);
      if (!all.trim()) throw new Error("No readable text found in the uploads.");
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
    await supabase.from("podcasts").update({ status: "generating" }).eq("id", p.id);
    try {
      const { data: cards } = await supabase.from("cards").select("q,a").eq("section_id", p.section_id!).order("position");
      const facts = (cards ?? []).map((c) => `Q: ${c.q}\nA: ${c.a}`).join("\n");
      const script = await aiText(
        `Write a short, fun, memorable audio lesson (about 500 words) that a narrator reads aloud. Teach the facts below in a vivid way: a story or scene, analogies, a mnemonic, and 2 quick "pause and recall" questions with the answers given after. Warm, friendly, simple words. Plain text only, no stage directions, no markdown. Use only these facts.`,
        [{ role: "user", content: `Topic: ${p.title}\n${p.detail}\n\n${facts}` }],
      );
      const chunks = chunkText(script);
      const paths: string[] = [];
      for (const [i, c] of chunks.entries()) {
        const wav = await speech(c);
        const path = `episodes/${p.exam_id}/${p.id}/${i}.wav`;
        const { error } = await supabaseAdmin.storage.from("audio").upload(path, wav, { contentType: "audio/wav", upsert: true });
        if (error) throw error;
        paths.push(path);
      }
      await supabase.from("podcasts").update({ script, storage_paths: paths, status: "ready" }).eq("id", p.id);
      return { urls: await signed(paths) };
    } catch (e) {
      await supabase.from("podcasts").update({ status: "empty" }).eq("id", p.id);
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
  .inputValidator((d: { text: string }) => ({ text: String(d.text).slice(0, 2500) }))
  .handler(async ({ data }) => {
    const { speech, chunkText } = await import("./ai/gateway.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const chunks = chunkText(data.text, 1200);
    const paths: string[] = [];
    for (const c of chunks) {
      const path = `tts/${await sha(c)}.wav`;
      const { data: hit } = await supabaseAdmin.storage.from("audio").createSignedUrl(path, 60);
      if (!hit?.signedUrl) {
        const wav = await speech(c);
        const { error } = await supabaseAdmin.storage.from("audio").upload(path, wav, { contentType: "audio/wav", upsert: true });
        if (error) throw error;
      }
      paths.push(path);
    }
    return { urls: await signed(paths) };
  });

export const transcribeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audio: string; mime: string }) => {
    if (d.audio.length > 14_000_000) throw new Error("Recording is too long. Keep it under 5 minutes.");
    return d;
  })
  .handler(async ({ data }) => {
    const { transcribe, fromBase64 } = await import("./ai/gateway.server");
    const text = await transcribe(fromBase64(data.audio), data.mime.split(";")[0] || "audio/webm");
    return { text };
  });
