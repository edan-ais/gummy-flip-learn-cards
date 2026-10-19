import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, Square, Trash2, FileText, Loader2, ExternalLink, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { actionError, useSpendGuard } from "@/lib/gems-client";
import { processCost } from "@/lib/gems";
import { supabase } from "@/integrations/supabase/client";
import { type Material } from "@/lib/exam-data";
import { processExam, transcribeNote } from "@/lib/study.functions";
import { ReadAloud } from "@/lib/read-aloud";

const notesQuery = (examId: string) =>
  queryOptions({
    queryKey: ["notes", examId],
    queryFn: async () => {
      const { data } = await supabase.from("personal_notes").select("*").eq("exam_id", examId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

/** Uploaded materials + personal notes, shown on the exam home page. */
export function NotesPanel({ examId, materials }: { examId: string; materials: Material[] }) {
  const [tab, setTab] = useState<"uploaded" | "mine">("uploaded");
  return (
    <section className="mt-6">
      <p className="eyebrow">Notes</p>
      <h2 className="page-title text-xl">{tab === "uploaded" ? "What you uploaded" : "My notes"}</h2>
      <div className="seg mb-4 mt-3">
        <button data-active={tab === "uploaded"} onClick={() => setTab("uploaded")}>
          Uploaded
        </button>
        <button data-active={tab === "mine"} onClick={() => setTab("mine")}>
          My notes
        </button>
      </div>
      {tab === "uploaded" ? (
        <div className="space-y-3">
          <AddMaterials examId={examId} />
          {materials.length === 0 && <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>}
          {materials.map((m, i) => (
            <MaterialView key={m.id} m={m} open={i === 0} />
          ))}
        </div>
      ) : (
        <MyNotes examId={examId} />
      )}
    </section>
  );
}

/** Upload or photograph more chapter material; rebuilds the study set. */
function AddMaterials({ examId }: { examId: string }) {
  const qc = useQueryClient();
  const process = useServerFn(processExam);
  const { confirmSpend, dialog } = useSpendGuard();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => {
      const ok = f.type === "application/pdf" || f.type.startsWith("image/") || f.name.endsWith(".docx") || f.type.startsWith("text/");
      if (!ok) toast.error(`${f.name}: use PDF, photos, Word (.docx) or text files.`);
      else if (f.size > 25 * 1024 * 1024) toast.error(`${f.name} is over 25 MB.`);
      return ok && f.size <= 25 * 1024 * 1024;
    });
    if (!list.length) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const known = new Set(
        ((await supabase.from("materials").select("file_hash").eq("exam_id", examId).not("file_hash", "is", null)).data ?? []).map(
          (m) => m.file_hash as string,
        ),
      );
      let added = 0;
      for (const f of list) {
        const d = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
        const hash = [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (known.has(hash)) {
          toast(`${f.name} is already uploaded — skipping the copy.`);
          continue;
        }
        let text = "";
        if (f.name.endsWith(".docx")) {
          const mammoth = await import("mammoth");
          text = (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
        } else if (f.type.startsWith("text/")) {
          text = await f.text();
        }
        const path = `${u.user!.id}/${examId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("materials").upload(path, f, { contentType: f.type || undefined });
        if (error) throw error;
        const { error: e2 } = await supabase
          .from("materials")
          .insert({ exam_id: examId, name: f.name, mime: f.type || "text/plain", storage_path: path, extracted_text: text, file_hash: hash });
        if (e2) throw e2;
        known.add(hash);
        added++;
      }
      if (!added) return;
      if (!(await confirmSpend(processCost(added * 8000, added)))) return;
      toast("Reading your new pages… this can take a minute or two.");
      const r = await process({ data: { examId } });
      if (!r.ok) actionError(r.error, "We couldn't add those pages.");
      else toast.success("Added! Your study set now includes the new pages.");
      await qc.invalidateQueries();
    } catch (e) {
      actionError(e, "That upload didn't go through. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  };

  return (
    <div className="gummy-card p-3">
      {dialog}
      <div className="grid grid-cols-2 gap-3">
        <button className="gummy-btn" data-variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Upload
        </button>
        <button className="gummy-btn" data-variant="ghost" onClick={() => camRef.current?.click()} disabled={busy}>
          <Camera size={18} /> Camera
        </button>
      </div>
      <p className="caption mt-2 text-center">Add more chapter pages — the study set updates to include them.</p>
      <input ref={fileRef} type="file" hidden multiple accept=".pdf,image/*,.docx,.txt,.md,text/plain" onChange={(e) => add(e.target.files)} />
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={(e) => add(e.target.files)} />
    </div>
  );
}

function MaterialView({ m, open: initial }: { m: Material; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (open && m.storage_path && !url)
      supabase.storage.from("materials").createSignedUrl(m.storage_path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [open]);
  return (
    <div className="gummy-card overflow-hidden p-0">
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <FileText size={18} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-bold">{m.name}</span>
        <ChevronDown size={18} className="chev" data-open={open} />
      </button>
      <div className="reveal" data-open={open}>
        <div>
          <div className="px-4 pb-4">
            {url && m.mime.startsWith("image/") && <img src={url} alt={m.name} className="mb-3 w-full rounded-2xl" />}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="gummy-chip mb-3">
                <ExternalLink size={14} /> Open original
              </a>
            )}
            <div className="flex justify-end">
              <ReadAloud text={m.extracted_text.slice(0, 2500)} />
            </div>
            <div className="uploaded-text">{m.extracted_text || "No text found in this file."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyNotes({ examId }: { examId: string }) {
  const { data: notes = [] } = useQuery(notesQuery(examId));
  const qc = useQueryClient();
  const transcribe = useServerFn(transcribeNote);
  const [body, setBody] = useState("");
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [busy, setBusy] = useState(false);
  const chunks = useRef<Blob[]>([]);
  const source = useRef<"typed" | "voice">("typed");

  const save = async () => {
    if (!body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("personal_notes").insert({ user_id: u.user!.id, exam_id: examId, body: body.trim(), source: source.current });
    if (error) return toast.error(error.message);
    setBody("");
    source.current = "typed";
    qc.invalidateQueries({ queryKey: ["notes", examId] });
  };

  const record = async () => {
    if (rec) return rec.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const r = new MediaRecorder(stream, { mimeType: type });
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        const blob = new Blob(chunks.current, { type });
        if (blob.size < 1000) return toast.error("That recording was too short.");
        setBusy(true);
        try {
          const b = new Uint8Array(await blob.arrayBuffer());
          let s = "";
          for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
          const { text } = await transcribe({ data: { audio: btoa(s), mime: type } });
          if (!text.trim()) toast("No words came through. Try again a little closer to the mic.");
          setBody((x) => (x ? x + "\n" : "") + text);
          source.current = "voice";
        } catch (e) {
          actionError(e, "Could not turn that into text.");
        } finally {
          setBusy(false);
        }
      };
      r.start();
      setRec(r);
    } catch {
      toast.error("Microphone access is needed to record a note.");
    }
  };

  return (
    <div>
      <div className="gummy-card space-y-3">
        <textarea className="gummy-input min-h-32" placeholder="Type a note, or tap the mic and say it" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <button className="gummy-icon lg" data-rec={!!rec} onClick={record} aria-label={rec ? "Stop recording" : "Record a note"} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : rec ? <Square fill="currentColor" size={18} /> : <Mic />}
          </button>
          <button className="gummy-btn" data-variant="primary" onClick={save} disabled={!body.trim()}>
            Save note
          </button>
        </div>
        {rec && <p className="text-sm font-bold text-primary">Listening… tap stop when you're done.</p>}
      </div>
      <ul className="mt-4 space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="gummy-card p-4 animate-rise">
            <div className="flex items-center justify-between">
              <span className="eyebrow">
                {n.source === "voice" ? "Spoken" : "Typed"} · {new Date(n.created_at).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <ReadAloud text={n.body} />
                <button
                  className="gummy-icon sm"
                  aria-label="Delete note"
                  onClick={async () => {
                    await supabase.from("personal_notes").delete().eq("id", n.id);
                    qc.invalidateQueries({ queryKey: ["notes", examId] });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
