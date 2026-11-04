import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/study/Shell";
import { ScriptEditor } from "@/components/study/ScriptEditor";

export const Route = createFileRoute("/_authenticated/scripts/new")({
  head: () => ({ meta: [
    { title: "New script · StudyLamb" },
    { name: "description", content: "Save your exact script for word-for-word recall and listening with StudyLamb." },
    { property: "og:title", content: "New script · StudyLamb" },
    { property: "og:description", content: "Rehearse a speech or scene without changing its words." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: NewScript,
});
function NewScript() {
  const [ids] = useState(() => ({ examId: crypto.randomUUID(), courseId: crypto.randomUUID() }));
  const qc = useQueryClient(); const nav = useNavigate();
  return <Page title="New script" eyebrow="Word for word" action={<Link to="/courses" className="gummy-icon" aria-label="Back to classes"><ChevronLeft /></Link>}>
    <ScriptEditor {...ids} onSaved={async () => { await qc.invalidateQueries({ queryKey: ["courses"] }); await nav({ to: "/exam/$examId/memorize", params: { examId: ids.examId } }); }} />
  </Page>;
}