import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GEM_PACKS } from "@/lib/gems";

export function BrainBucksPacks() {
  return <div className="brainbucks-packs">
    {GEM_PACKS.map((pack) => <Button key={pack.id} variant="outline" className="brainbucks-pack" onClick={() => toast("Purchases aren't available yet. No payment was taken.")}>
      <Banknote className="gem-icon" size={22} />
      <span>{pack.gems} BrainBucks</span>
      <strong>${pack.priceUsd.toFixed(2)}</strong>
    </Button>)}
    <p className="caption">Purchases coming soon</p>
  </div>;
}