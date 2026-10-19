import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gem } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NOT_ENOUGH } from "./gems";

export const walletQuery = queryOptions({
  queryKey: ["gems"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("ensure_wallet");
    if (error) throw error;
    return data as number;
  },
});

export function useGems() {
  const q = useQuery(walletQuery);
  const qc = useQueryClient();
  return { balance: q.data, refresh: () => qc.invalidateQueries({ queryKey: ["gems"] }) };
}

/** Friendly message for any failed action; points to the gem shop when the wallet is short. */
export function actionError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : fallback;
  if (msg.includes(NOT_ENOUGH)) {
    toast("You need a few more gems for this.", {
      description: "Get gems, then tap the button again.",
      action: { label: "Get gems", onClick: () => (window.location.href = "/gems") },
    });
    return;
  }
  toast.error(msg || fallback);
}

export function GemChip() {
  const { balance } = useGems();
  return (
    <Link to="/gems" className="goal-chip gem-chip" aria-label={`${balance ?? "…"} gems. Get more`}>
      <Gem size={16} className="gem-icon" />
      <span>{balance ?? "…"}</span>
    </Link>
  );
}
