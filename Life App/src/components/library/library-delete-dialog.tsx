"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LibraryDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function LibraryDeleteDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: LibraryDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      setDeleting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  function handleClose() {
    if (deleting) return;
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-base">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={deleting} autoFocus>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
