import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { GemChip, LowBalanceNudge, actionError } from "@/lib/gems-client";
import { Plus, Settings2, ChevronRight, Loader2, AlertCircle, Trash2, LogOut, Pencil, FileUp, Check, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/study/Shell";
import { BrandLogo } from "@/components/study/BrandLogo";
import { buildFinalReview, processSyllabus } from "@/lib/study.functions";

const COLORS = ["coral", "mint", "sky", "sun", "grape"] as const;

const coursesQuery = queryOptions({
  queryKey: ["courses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id,title,color,is_sample,created_at, exams(id,title,status,created_at,is_sample)")
      .order("is_sample", { ascending: false })
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Your classes · StudyLamb" },
      { name: "description", content: "Open a class and exam, or create new ones from your study materials." },
      { property: "og:title", content: "Your classes · StudyLamb" },
      { property: "og:description", content: "Your classes and exams in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQuery),
  component: Courses,
});

function Courses() {
  const { data } = useSuspenseQuery(coursesQuery);
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user } = Route.useRouteContext();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<string>("mint");
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [buildingFinal, setBuildingFinal] = useState(false);
  const buildFinal = useServerFn(buildFinalReview);

  const refresh = () => qc.invalidateQueries({ queryKey: ["courses"] });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: c, error } = await supabase.from("courses").insert({ title: title.trim(), color, owner_id: user.id }).select("id").single();
    if (error) return toast.error(error.message);
    setTitle("");
    setAdding(false);
    await refresh();
    nav({ to: "/exams/new", search: { courseId: c.id } });
  };

  const renameCourse = async (id: string, current: string) => {
    const next = prompt("Rename class", current)?.trim();
    if (!next || next === current) return;
    const { error } = await supabase.from("courses").update({ title: next }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeCourse = async (id: string) => {
    if (!confirm("Delete this class and all its exams?")) return;
    await supabase.from("courses").delete().eq("id", id);
    refresh();
  };

  const renameExam = async (id: string, current: string) => {
    const next = prompt("Rename exam", current)?.trim();
    if (!next || next === current) return;
    const { error } = await supabase.from("exams").update({ title: next }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeExam = async (id: string) => {
    if (!confirm("Delete this exam and its study materials?")) return;
    await supabase.from("exams").delete().eq("id", id);
    refresh();
  };

  const togglePick = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const makeFinal = async () => {
    if (!picked.size) return;
    setBuildingFinal(true);
    try {
      const { examId } = await buildFinal({ data: { courseIds: [...picked] } });
      await qc.invalidateQueries();
      toast.success("Your final review is ready — everything from the classes you picked.");
      nav({ to: "/exam/$examId", params: { examId } });
    } catch (e) {
      actionError(e, "Couldn't build the final review.");
    } finally {
      setBuildingFinal(false);
    }
  };

  const ownCourses = data.filter((c) => !c.is_sample);

  return (
    <Page
      eyebrow="StudyLamb"
      title="Your classes"
      action={
        <div className="flex items-center gap-2">
          <LowBalanceNudge />
          <GemChip />
          <Link to="/settings" className="gummy-icon" aria-label="Settings">
            <Settings2 size={18} />
          </Link>
          <button
            className="gummy-icon"
            aria-label="Sign out"
            onClick={async () => {
              await qc.cancelQueries();
              qc.clear();
              await supabase.auth.signOut();
              nav({ to: "/auth", replace: true });
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="mb-5 flex items-center gap-3">
          <BrandLogo compact />
          <p className="text-sm font-bold text-muted-foreground">Professor Lamby</p>
        </div>
        {data.map((c, i) => (
          <section key={c.id} className="course-card animate-rise" data-color={c.color} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {picking && !c.is_sample && (
                  <button
                    className="gummy-icon sm shrink-0"
                    role="checkbox"
                    aria-checked={picked.has(c.id)}
                    aria-label={`Include ${c.title} in final review`}
                    onClick={() => togglePick(c.id)}
                  >
                    {picked.has(c.id) && <Check size={15} />}
                  </button>
                )}
                <div className="min-w-0">
                  {c.is_sample && <span className="eyebrow">Sample class</span>}
                  <h2 className="truncate font-display text-xl font-bold">{c.title}</h2>
                </div>
              </div>
              {!c.is_sample && !picking && (
                <div className="flex gap-1">
                  <button className="gummy-icon sm" onClick={() => renameCourse(c.id, c.title)} aria-label="Rename class">
                    <Pencil size={15} />
                  </button>
                  <button className="gummy-icon sm" onClick={() => removeCourse(c.id)} aria-label="Delete class">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {c.exams.map((e) => (
                <li key={e.id} className="flex items-center gap-1">
                  <Link to="/exam/$examId" params={{ examId: e.id }} className="exam-row flex-1">
                    <span className="min-w-0 flex-1 truncate font-bold">{e.title}</span>
                    {e.status === "processing" && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
                    {e.status === "failed" && <AlertCircle size={16} className="text-destructive" />}
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </Link>
                  {!e.is_sample && !picking && (
                    <>
                      <button className="gummy-icon sm shrink-0" onClick={() => renameExam(e.id, e.title)} aria-label="Rename exam">
                        <Pencil size={14} />
                      </button>
                      <button className="gummy-icon sm shrink-0" onClick={() => removeExam(e.id)} aria-label="Delete exam">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </li>
              ))}
              {!c.is_sample && (
                <li>
                  <Link to="/exams/new" search={{ courseId: c.id }} className="exam-row dashed">
                    <Plus size={18} /> <span className="font-bold">New exam</span>
                  </Link>
                </li>
              )}
            </ul>
          </section>
        ))}

        {adding ? (
          <form onSubmit={create} className="gummy-card space-y-3 animate-pop">
            <input autoFocus className="gummy-input" placeholder="Class name, e.g. Science or Math" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-2">
              {COLORS.map((k) => (
                <button type="button" key={k} className="swatch" data-color={k} data-active={color === k} onClick={() => setColor(k)} aria-label={k} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="gummy-btn" data-variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="gummy-btn" data-variant="primary">
                Create
              </button>
            </div>
          </form>
        ) : picking ? (
          <div className="gummy-card space-y-3 animate-pop">
            <p className="text-sm font-bold">Pick the classes on your final ({picked.size} picked)</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="gummy-btn"
                data-variant="ghost"
                onClick={() => {
                  setPicking(false);
                  setPicked(new Set());
                }}
              >
                Cancel
              </button>
              <button className="gummy-btn" data-variant="primary" disabled={!picked.size || buildingFinal} onClick={makeFinal}>
                {buildingFinal ? <Loader2 className="animate-spin" size={18} /> : <GraduationCap size={18} />} Build final review
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <button className="gummy-btn w-full" data-variant="primary" onClick={() => setAdding(true)}>
              <Plus size={18} /> New class
            </button>
            <SyllabusUpload onDone={refresh} />
            {ownCourses.length > 0 && (
              <button className="gummy-btn w-full" data-variant="ghost" onClick={() => setPicking(true)}>
                <GraduationCap size={18} /> Final review: pick classes
              </button>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}

/** Upload a syllabus; AI reads it and creates the class with its major exams. */
function SyllabusUpload({ onDone }: { onDone: () => Promise<unknown> }) {
  const run = useServerFn(processSyllabus);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const ok = f.type === "application/pdf" || f.type.startsWith("image/") || f.name.endsWith(".docx") || f.type.startsWith("text/");
    if (!ok) return toast.error("Use a PDF, photo, Word (.docx) or text file.");
    if (f.size > 25 * 1024 * 1024) return toast.error("That file is over 25 MB.");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let text = "";
      let path: string | undefined;
      if (f.name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
      } else if (f.type.startsWith("text/")) {
        text = await f.text();
      } else {
        path = `${u.user!.id}/syllabus/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("materials").upload(path, f, { contentType: f.type || undefined });
        if (error) throw error;
      }
      const r = await run({ data: { name: f.name, mime: f.type || "text/plain", text: text || undefined, path } });
      toast.success(`Added ${r.created.length} class${r.created.length === 1 ? "" : "es"} with ${r.created.reduce((n, c) => n + c.exams, 0)} exams from your syllabus.`);
      await onDone();
    } catch (e) {
      actionError(e, "We couldn't read that syllabus. Try a clearer file.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <button className="gummy-btn w-full" data-variant="ghost" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} />} Upload a syllabus
      </button>
      <input ref={ref} type="file" hidden accept=".pdf,image/*,.docx,.txt,.md,text/plain" onChange={(e) => handle(e.target.files)} />
    </>
  );
}
