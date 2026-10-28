import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canAfford, isFundsError } from "./study-feedback";
import { FUNDS_EVENT } from "@/components/study/BrainBucksDialog";
import { StudyDialog } from "@/components/study/StudyDialog";
import { BrainBucksPacks } from "@/components/study/BrainBucksPacks";
import { Button } from "@/components/ui/button";

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

/** Friendly message for any failed action; points to the BrainBucks shop when the wallet is short. */
export function actionError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : fallback;
  if (isFundsError(e)) {
    window.dispatchEvent(new Event(FUNDS_EVENT));
    return;
  }
  toast.error(msg || fallback);
}

/** One-time-per-session reminder when the balance runs low. */
export function LowBalanceNudge() {
  const { balance } = useGems();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current || balance == null || balance > 5) return;
    shown.current = true;
    if (sessionStorage.getItem("studylamb:funds-nudge")) return;
    sessionStorage.setItem("studylamb:funds-nudge", "shown");
    window.dispatchEvent(new Event(FUNDS_EVENT));
  }, [balance]);
  return null;
}

/**
 * Ask before a spend that would use all (or nearly all, 95%+) of the balance.
 * Returns true to proceed. Offers cheaper options but lets the student push past.
 */
export function useSpendGuard() {
  const { balance } = useGems();
  const [pending, setPending] = useState<{ cost: number; resolve: (ok: boolean) => void } | null>(null);

  const confirmSpend = (cost: number) => {
    if (cost <= 0) return Promise.resolve(true);
    if (balance != null && !canAfford(cost, balance)) {
      window.dispatchEvent(new Event(FUNDS_EVENT));
      return Promise.resolve(false);
    }
    if (balance == null || cost < balance * 0.95) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => setPending({ cost, resolve }));
  };

  const done = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending && (
    <StudyDialog open onOpenChange={(open) => { if (!open) done(false); }} title="This uses almost all your BrainBucks"
      description={`It costs ${pending.cost} and you have ${balance}. You can still go ahead, or top up first.`}>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Convert scans and photos to one PDF first.</li>
          <li>Compress big PDFs before uploading.</li>
          <li>Upload one chapter at a time instead of everything at once.</li>
        </ul>
        <div className="mt-4 grid gap-2">
          <Button className="gummy-btn" onClick={() => done(true)}>
            Go ahead anyway
          </Button>
          <Button className="gummy-btn" variant="secondary" onClick={() => done(false)}>
            Go back
          </Button>
        </div>
        <BrainBucksPacks />
    </StudyDialog>
  );

  return { confirmSpend, dialog };
}

export function GemChip() {
  const { balance } = useGems();
  return (
    <Link to="/gems" className="goal-chip gem-chip" aria-label={`${balance ?? "…"} BrainBucks. Get more`}>
      <Banknote size={16} className="gem-icon" />
      <span>{balance ?? "…"}</span>
    </Link>
  );
}
