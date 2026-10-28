import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteDialog({ title, description, onConfirm, onClose }: {
  title: string; description: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="study-dialog">
      <DialogTitle className="study-dialog-title">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="gummy-btn" disabled={busy} onClick={onClose}>Keep it</Button>
        <Button variant="destructive" className="gummy-btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await onConfirm(); onClose(); } finally { setBusy(false); }
        }}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete</Button>
      </div>
    </DialogContent>
  </Dialog>;
}