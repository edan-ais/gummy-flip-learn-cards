import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveScript } from "@/lib/scripts.functions";
import { actionError } from "@/lib/gems-client";

export function ScriptEditor({ examId, courseId, initialTitle = "", initialText = "", onSaved }: {
  examId: string; courseId: string; initialTitle?: string; initialText?: string; onSaved: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const save = useServerFn(saveScript);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (lock.current || !title.trim() || !text.trim()) return;
    lock.current = true; setBusy(true);
    try { await save({ data: { examId, courseId, title, text } }); await onSaved(); }
    catch (error) { actionError(error, "Couldn't save your script."); }
    finally { lock.current = false; setBusy(false); }
  }}>
    <label className="block font-bold">Script title<input required className="gummy-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My speech or scene" disabled={busy} /></label>
    <div className="flex items-center justify-between gap-2"><label htmlFor="script-text" className="font-bold">Exact script</label>
      <Button type="button" variant="outline" className="gummy-chip" disabled={busy} onClick={() => file.current?.click()}><Upload size={16} /> Upload text / Word</Button>
    </div>
    <input hidden ref={file} type="file" accept=".txt,.md,.docx,text/plain" onChange={async (e) => {
      const uploaded = e.target.files?.[0]; if (!uploaded) return;
      try {
        if (uploaded.name.toLowerCase().endsWith(".docx")) {
          const mammoth = await import("mammoth");
          setText((await mammoth.extractRawText({ arrayBuffer: await uploaded.arrayBuffer() })).value);
        } else setText(await uploaded.text());
      } catch (error) { actionError(error, "Couldn't open that script."); }
      e.target.value = "";
    }} />
    <textarea id="script-text" required rows={12} className="gummy-input w-full resize-y" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your script exactly as you want to learn it…" disabled={busy} />
    <Button type="submit" className="gummy-btn w-full" disabled={busy || !title.trim() || !text.trim()}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {busy ? "Saving…" : "Save script"}</Button>
  </form>;
}