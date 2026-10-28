import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, ClipboardType, X, Loader2, Upload, Camera, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { actionError, useSpendGuard } from "@/lib/gems-client";
import { processCost } from "@/lib/gems";
import { supabase } from "@/integrations/supabase/client";
import { processExam } from "@/lib/study.functions";
import { restorePendingUpload, persistPendingUpload } from "@/lib/pending-upload";
import { Page } from "@/components/study/Shell";

type Search = { courseId?: string; examId?: string; pending?: boolean; course?: string };

export const Route = createFileRoute("/_authenticated/exams/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    courseId: typeof s.courseId === "string" ? s.courseId : undefined,
    examId: typeof s.examId === "string" ? s.examId : undefined,
    pending: s.pending === "1" || s.pending === 1 || s.pending === true,
    course: typeof s.course === "string" ? s.course : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New exam · StudyLamb" },
      { name: "description", content: "Upload notes, chapters or photos and turn them into study materials." },
      { property: "og:title", content: "New exam · StudyLamb" },
      { property: "og:description", content: "Upload study materials and build your exam prep." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewExam,
});

type Item = { id: string; file?: File; text?: string; name: string; kind: "pdf" | "image" | "doc" | "text"; hash?: string };

async function hashFile(f: File) {
  const d = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const kindOf = (f: File): Item["kind"] | null => {
  if (f.type === "application/pdf") return "pdf";
  if (f.type.startsWith("image/")) return "image";
  if (f.name.endsWith(".docx")) return "doc";
  if (f.type.startsWith("text/") || /\.(txt|md)$/i.test(f.name)) return "text";
  return null;
};

function NewExam() {
  const { courseId, examId, pending, course } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const nav = useNavigate();
  const qc = useQueryClient();
  const process = useServerFn(processExam);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [courseName, setCourseName] = useState(course ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const { confirmSpend, dialog } = useSpendGuard();
  const existingHashes = useRef<Set<string> | null>(null);

  const knownHashes = async () => {
    if (!existingHashes.current) {
      existingHashes.current = new Set(
        examId
          ? ((await supabase.from("materials").select("file_hash").eq("exam_id", examId).not("file_hash", "is", null)).data ?? []).map(
              (m) => m.file_hash as string,
            )
          : [],
      );
    }
    return existingHashes.current;
  };

  const addFiles = async (files: FileList | null) => {
    const next: Item[] = [];
    const known = await knownHashes();
    for (const f of Array.from(files ?? [])) {
      const k = kindOf(f);
      if (!k) {
        toast.error(`${f.name}: use PDF, photos, Word (.docx) or text files.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} is over 25 MB.`);
        continue;
      }
      const hash = await hashFile(f);
      if (known.has(hash) || items.some((x) => x.hash === hash) || next.some((x) => x.hash === hash)) {
        toast(`${f.name} is already uploaded — skipping the copy.`);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file: f, name: f.name, kind: k, hash });
    }
    setItems((x) => [...x, ...next]);
  };

  // Onboarding hands off picked files here after sign-in.
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    void restorePendingUpload().then((p) => {
    if (cancelled) return;
    if (!p) return;
    if (p.courseName && !courseId) setCourseName(p.courseName);
    setItems((x) => [
      ...p.files
        .flatMap((f) => {
          const kind = kindOf(f);
          return kind ? [{ id: crypto.randomUUID(), file: f, name: f.name, kind, hash: undefined }] : [];
        }),
      ...(p.text ? [{ id: crypto.randomUUID(), text: p.text, name: "Pasted notes", kind: "text" as const }] : []),
      ...x,
    ]);
    }).catch(() => toast.error("Please select your notes again."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!examId && !title.trim()) return toast.error("Name your exam first.");
    if (!items.length) return toast.error("Add at least one study material.");
    try {
      let cid = courseId;
      if (!cid && courseName.trim()) {
        const { data: c, error: cerr } = await supabase
          .from("courses")
          .insert({ title: courseName.trim(), color: "mint", owner_id: user.id })
          .select("id")
          .single();
        if (cerr) throw cerr;
        cid = c.id;
      }
      if (!cid) {
        setBusy(null);
        return toast.error("Add a class first, then upload your notes.");
      }
      setBusy("Saving your materials…");
      let id = examId;
      if (!id) {
        const { data, error } = await supabase
          .from("exams")
          .insert({ course_id: cid, owner_id: user.id, title: title.trim(), status: "processing" })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      for (const it of items) {
        let text = it.text ?? "";
        let path: string | null = null;
        let mime = it.file?.type || "text/plain";
        if (it.file && it.kind === "doc") {
          const mammoth = await import("mammoth");
          text = (await mammoth.extractRawText({ arrayBuffer: await it.file.arrayBuffer() })).value;
          mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (it.file && it.kind === "text") {
          text = await it.file.text();
        }
        if (it.file) {
          path = `${user.id}/${id}/${it.id}-${it.file.name.replace(/[^\w.-]/g, "_")}`;
          const { error } = await supabase.storage.from("materials").upload(path, it.file, { contentType: it.file.type || undefined });
          if (error) throw error;
        }
        const { error } = await supabase
          .from("materials")
          .insert({ exam_id: id, name: it.name, mime, storage_path: path, extracted_text: text, file_hash: it.hash ?? null });
        if (error) throw error;
      }
      const estChars = items.reduce((n, it) => n + (it.text?.length ?? (it.kind === "text" || it.kind === "doc" ? 0 : 8000)), 0);
      const estFiles = items.filter((it) => it.file && it.kind !== "text" && it.kind !== "doc").map((it) => it.file!.size);
      setBusy(null);
      if (!(await confirmSpend(processCost(estChars, estFiles)))) return;
      setBusy("Reading and organizing… this can take a minute or two.");
      const r = await process({ data: { examId: id } });
      await qc.invalidateQueries();
      if (!r.ok) actionError(r.error, "We couldn't build this study set.");
      else {
        if (pending) await persistPendingUpload(null);
        toast.success("Your study set is ready. Next: start with Cards.");
      }
      nav({ to: "/exam/$examId", params: { examId: id } });
    } catch (e) {
      actionError(e, "That upload didn't go through. Try again.");
      setBusy(null);
    }
  };

  const Icon = { pdf: FileText, image: ImageIcon, doc: FileText, text: ClipboardType };

  if (busy)
    return (
      <Page title="Building your study set">
        <div className="gummy-card flex flex-col items-center gap-4 py-12 text-center animate-pop">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="font-bold">{busy}</p>
          <p className="text-sm text-muted-foreground">We're splitting it into sections, flashcards and practice questions.</p>
        </div>
      </Page>
    );

  return (
    <Page
      eyebrow={examId ? "Add materials" : "New exam"}
      title={examId ? "Add more" : "What are you studying?"}
      action={
        <button className="gummy-icon" onClick={() => nav({ to: examId ? "/exam/$examId" : "/courses", params: examId ? { examId } : undefined })} aria-label="Back">
          <ChevronLeft />
        </button>
      }
    >
      {dialog}
      {!examId && (
        <input className="gummy-input mb-4" placeholder="Exam name, e.g. Unit 3 test" value={title} onChange={(e) => setTitle(e.target.value)} />
      )}
      <div className="grid grid-cols-3 gap-3">
        <button className="upload-tile" onClick={() => fileRef.current?.click()}>
          <Upload /> Files
        </button>
        <button className="upload-tile" onClick={() => camRef.current?.click()}>
          <Camera /> Photo
        </button>
        <button className="upload-tile" onClick={() => setShowPaste(true)}>
          <ClipboardType /> Paste
        </button>
      </div>
      <p className="caption mt-2 text-center">PDFs, photos of pages, Word (.docx) or text files. Up to 25 MB each.</p>
      <input ref={fileRef} type="file" hidden multiple accept=".pdf,image/*,.docx,.txt,.md,text/plain" onChange={(e) => addFiles(e.target.files)} />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => addFiles(e.target.files)} />

      {showPaste && (
        <div className="gummy-card mt-4 space-y-3 animate-pop">
          <textarea className="gummy-input min-h-40" placeholder="Paste notes, a chapter, a study guide…" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button
            className="gummy-btn w-full"
            data-variant="ghost"
            onClick={() => {
              if (!paste.trim()) return;
              setItems((x) => [...x, { id: crypto.randomUUID(), text: paste, name: `Pasted notes ${x.length + 1}`, kind: "text" }]);
              setPaste("");
              setShowPaste(false);
            }}
          >
            Add pasted text
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((it) => {
          const I = Icon[it.kind];
          return (
            <li key={it.id} className="exam-row animate-pop">
              <I size={18} className="text-primary" />
              <span className="min-w-0 flex-1 truncate font-bold">{it.name}</span>
              <button onClick={() => setItems((x) => x.filter((y) => y.id !== it.id))} aria-label="Remove">
                <X size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      <button className="gummy-btn mt-6 w-full" data-variant="primary" onClick={submit} disabled={!items.length}>
        Build my study set
      </button>
    </Page>
  );
}
