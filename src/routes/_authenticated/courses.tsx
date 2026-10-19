import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GemChip } from "@/lib/gems-client";
import { Plus, Settings2, ChevronRight, Loader2, AlertCircle, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/study/Shell";

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
      { title: "Your courses · Study Studio" },
      { name: "description", content: "Open a course and exam, or create new ones from your study materials." },
      { property: "og:title", content: "Your courses · Study Studio" },
      { property: "og:description", content: "Your courses and exams in one place." },
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: c, error } = await supabase.from("courses").insert({ title: title.trim(), color, owner_id: user.id }).select("id").single();
    if (error) return toast.error(error.message);
    setTitle("");
    setAdding(false);
    await qc.invalidateQueries({ queryKey: ["courses"] });
    nav({ to: "/exams/new", search: { courseId: c.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course and all its exams?")) return;
    await supabase.from("courses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["courses"] });
  };

  return (
    <Page
      eyebrow="Hi there"
      title="Your courses"
      action={
        <div className="flex items-center gap-2">
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
        {data.map((c, i) => (
          <section key={c.id} className="course-card animate-rise" data-color={c.color} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                {c.is_sample && <span className="eyebrow">Sample course</span>}
                <h2 className="truncate font-display text-xl font-bold">{c.title}</h2>
              </div>
              {!c.is_sample && (
                <button className="gummy-icon sm" onClick={() => remove(c.id)} aria-label="Delete course">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {c.exams.map((e) => (
                <li key={e.id}>
                  <Link to="/exam/$examId" params={{ examId: e.id }} className="exam-row">
                    <span className="min-w-0 flex-1 truncate font-bold">{e.title}</span>
                    {e.status === "processing" && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
                    {e.status === "failed" && <AlertCircle size={16} className="text-destructive" />}
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </Link>
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
            <input autoFocus className="gummy-input" placeholder="Course name, e.g. Biology" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        ) : (
          <button className="gummy-btn w-full" data-variant="primary" onClick={() => setAdding(true)}>
            <Plus size={18} /> New course
          </button>
        )}
      </div>
    </Page>
  );
}
