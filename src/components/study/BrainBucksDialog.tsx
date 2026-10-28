import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StudyDialog } from "./StudyDialog";
import { BrainBucksPacks } from "./BrainBucksPacks";

export const FUNDS_EVENT = "studylamb:low-funds";

export function BrainBucksDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(FUNDS_EVENT, show);
    return () => window.removeEventListener(FUNDS_EVENT, show);
  }, []);
  return <StudyDialog open={open} onOpenChange={setOpen} title="You're running low on BrainBucks!"
    description="Professor Lamby is ready for your next study adventure. Pick a top-up for more new episodes and study sets.">
    <BrainBucksPacks />
    <Button className="gummy-btn" variant="secondary" onClick={() => setOpen(false)}>Keep studying</Button>
  </StudyDialog>;
}