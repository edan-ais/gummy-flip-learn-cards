import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GEM_COST, GEM_PACKS } from "@/lib/gems";
import { useGems } from "@/lib/gems-client";
import { BrainBucksPacks } from "@/components/study/BrainBucksPacks";

export const Route = createFileRoute("/_authenticated/gems")({
  head: () => ({
    meta: [
      { title: "BrainBucks · StudyLamb" },
      { name: "description", content: "BrainBucks power the smart tools in StudyLamb: building study sets, podcasts and read-aloud." },
      { property: "og:title", content: "BrainBucks · StudyLamb" },
      { property: "og:description", content: "BrainBucks power building study sets, podcasts and read-aloud." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gems,
});

const USES = [
  { label: "Build a study set from notes", cost: `${GEM_COST.parseBase + GEM_COST.parsePer30k}+` },
  { label: "Each PDF or photo to read", cost: `+${GEM_COST.ocrPerFile}` },
  { label: "Abstract podcast episode", cost: `${GEM_COST.episode}` },
  { label: "New read-aloud clip", cost: `${GEM_COST.speechClip}` },
  { label: "Spoken note to text", cost: `${GEM_COST.transcription}` },
];

function Gems() {
  const { balance } = useGems();
  const router = useRouter();
  const ledger = useQuery({
    queryKey: ["gem-ledger"],
    queryFn: async () =>
      (await supabase.from("gem_ledger").select("id,delta,reason,created_at").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  return (
    <main className="page">
      <button className="gummy-icon mb-4" aria-label="Back" onClick={() => router.history.back()}>
        <ChevronLeft />
      </button>
      <p className="eyebrow">Your BrainBucks</p>
      <h1 className="page-title flex items-center gap-2">
        <Banknote className="gem-icon" /> {balance ?? "…"}
      </h1>
      <p className="mt-2 text-muted-foreground">BrainBucks power the smart tools. Replaying audio you already made is free.</p>

      <h2 className="mt-6 mb-3 text-lg font-bold">Get BrainBucks</h2>
      <BrainBucksPacks />

      <h2 className="mt-6 mb-3 text-lg font-bold">What BrainBucks do</h2>
      <ul className="gummy-card divide-y p-0">
        {USES.map((u) => (
          <li key={u.label} className="flex justify-between gap-3 px-4 py-3">
            <span>{u.label}</span>
            <span className="font-bold">{u.cost}</span>
          </li>
        ))}
      </ul>

      {!!ledger.data?.length && (
        <>
          <h2 className="mt-6 mb-3 text-lg font-bold">Recent</h2>
          <ul className="gummy-card divide-y p-0">
            {ledger.data.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span>{l.reason}</span>
                <span className="font-bold" data-tone={l.delta > 0 ? "ok" : undefined}>
                  {l.delta > 0 ? `+${l.delta}` : l.delta}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to="/courses" className="gummy-btn mt-6 w-full" data-variant="ghost">
        Back to my classes
      </Link>
    </main>
  );
}
