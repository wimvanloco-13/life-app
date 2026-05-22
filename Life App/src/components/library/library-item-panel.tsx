"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { LibraryItem, LibraryItemType } from "@/types";

const ITEM_TYPES: { value: LibraryItemType; label: string }[] = [
  { value: "concept",  label: "Concept"  },
  { value: "protocol", label: "Protocol" },
  { value: "exercise", label: "Exercise" },
  { value: "tip",      label: "Tip"      },
];

interface LibraryItemPanelProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  initial?: LibraryItem;
  onSaved: (item: LibraryItem) => void;
}

interface FormState {
  title: string;
  type: LibraryItemType;
  what: string;
  why: string;
  how: string;
  durationOrReps: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "tip",
  what: "",
  why: "",
  how: "",
  durationOrReps: "",
};

export function LibraryItemPanel({
  open,
  onClose,
  categoryId,
  initial,
  onSaved,
}: LibraryItemPanelProps) {
  const isEdit = !!initial;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when opening in edit mode
  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          title: initial.title,
          type: initial.type,
          what: initial.what,
          why: initial.why,
          how: initial.how,
          durationOrReps: initial.durationOrReps ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setError(null);
    }
  }, [open, initial]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      title: form.title.trim(),
      type: form.type,
      what: form.what.trim(),
      why: form.why.trim(),
      how: form.how.trim(),
      durationOrReps: form.durationOrReps.trim() || undefined,
    };

    try {
      const url = isEdit
        ? `/api/library/items/${initial!.id}`
        : `/api/library/categories/${categoryId}/items`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const saved: LibraryItem = await res.json();
      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-[family-name:var(--font-display)] text-lg">
            {isEdit ? "Edit item" : "Add item"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={100}
              placeholder="e.g. The Kinetic Chain"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v as LibraryItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* What */}
          <div className="space-y-1.5">
            <Label htmlFor="item-what">What</Label>
            <Textarea
              id="item-what"
              value={form.what}
              onChange={(e) => set("what", e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="What is this?"
              required
            />
          </div>

          {/* Why */}
          <div className="space-y-1.5">
            <Label htmlFor="item-why">Why</Label>
            <Textarea
              id="item-why"
              value={form.why}
              onChange={(e) => set("why", e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="Why does it matter?"
              required
            />
          </div>

          {/* How */}
          <div className="space-y-1.5">
            <Label htmlFor="item-how">How</Label>
            <Textarea
              id="item-how"
              value={form.how}
              onChange={(e) => set("how", e.target.value)}
              maxLength={1200}
              rows={5}
              placeholder="How to do it"
              required
            />
          </div>

          {/* Duration / Reps (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="item-duration">Duration / Reps <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="item-duration"
              value={form.durationOrReps}
              onChange={(e) => set("durationOrReps", e.target.value)}
              maxLength={120}
              placeholder="e.g. 3 sets × 12 reps"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add item"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
