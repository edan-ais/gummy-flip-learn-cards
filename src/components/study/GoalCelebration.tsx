import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { shouldCelebrate } from "@/lib/study-feedback";
import { StudyDialog } from "./StudyDialog";

export function GoalCelebration({ today, userId }: { today: number; userId: string }) {
  const { s, ready } = useSettings();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const day = new Date().toLocaleDateString("en-CA");
    const key = `studylamb:goal:${userId}:${day}`;
    if (!shouldCelebrate(today, s.dailyGoal, localStorage.getItem(key) === "done")) return;
    localStorage.setItem(key, "done");
    setOpen(true);
  }, [today, s.dailyGoal, ready, userId]);
  return <StudyDialog open={open} onOpenChange={setOpen} title="You reached your daily goal!" celebration
    description={`You practiced ${s.dailyGoal} times today. Professor Lamby is celebrating the effort you put in!`}>
    <Button className="gummy-btn" onClick={() => setOpen(false)}>Keep going</Button>
    <Button variant="secondary" className="gummy-btn" onClick={() => setOpen(false)}>Take a well-earned break</Button>
  </StudyDialog>;
}