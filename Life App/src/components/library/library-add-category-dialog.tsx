"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LibraryAddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => Promise<void>;
  isLoading: boolean;
}

export function LibraryAddCategoryDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: LibraryAddCategoryDialogProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    setError(null);
    try {
      await onConfirm(trimmed);
      setTitle("");
      onOpenChange(false);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  function handleClose() {
    if (isLoading) return;
    setTitle("");
    setError(null);
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-base">
            Add category
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-title" className="text-sm">
              Title
            </Label>
            <Input
              id="category-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={80}
              placeholder="e.g. Footwork drills"
              disabled={isLoading}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
