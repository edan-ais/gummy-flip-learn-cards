import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BrandLogo } from "./BrandLogo";

export function StudyDialog({ open, onOpenChange, title, description, children, celebration = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string;
  description: string; children: ReactNode; celebration?: boolean;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="study-dialog" data-celebration={celebration}>
      <div className="study-dialog-mascot"><BrandLogo /></div>
      {celebration && <div className="lamby-confetti" aria-hidden>{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>}
      <DialogTitle className="study-dialog-title">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>;
}