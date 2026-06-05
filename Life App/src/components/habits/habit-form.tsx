"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CUE_TYPE_LABELS } from "@/types";
import type { Habit, HabitDraft } from "@/types";
import { useState } from "react";

const PRESET_COLORS = [
  "#c2700f", // amber
  "#b45309", // warm brown
  "#92400e", // deep amber
  "#7c3aed", // violet
  "#be185d", // rose
  "#0369a1", // sky
  "#047857", // emerald
  "#374151", // slate
];

const WALKTHROUGH_STEPS = [
  {
    id: "identity" as const,
    label: "Who do you want to be?",
    subtitle: "Habits are votes for the identity you want to build.",
    placeholder: "I am someone who moves their body every day.",
    field: "identity" as keyof HabitDraft,
    required: true,
    multiline: true,
  },
  {
    id: "name" as const,
    label: "What's the habit?",
    subtitle: "Name it simply. You'll know it when you see it.",
    placeholder: "Morning run",
    field: "name" as keyof HabitDraft,
    required: true,
    multiline: false,
  },
  {
    id: "cue" as const,
    label: "What triggers it?",
    subtitle: "Habit stacking: after [current habit], I will [new habit].",
    placeholder: "After I make coffee",
    field: "cue" as keyof HabitDraft,
    required: false,
    multiline: false,
  },
  {
    id: "minimumVersion" as const,
    label: "What's the two-minute version?",
    subtitle: "The version so easy you can't say no. Show up, even briefly.",
    placeholder: "Put on my shoes and step outside",
    field: "minimumVersion" as keyof HabitDraft,
    required: false,
    multiline: false,
  },
  {
    id: "reward" as const,
    label: "What's your reward?",
    subtitle: "Define the reward your brain learns to crave. Leave it blank if you're not sure yet.",
    placeholder: "calm, clear-headed, energised",
    field: "reward" as keyof HabitDraft,
    required: false,
    multiline: false,
  },
] as const;

type WalkthroughStep = (typeof WALKTHROUGH_STEPS)[number]["id"] | "review";

interface HabitFormProps {
  open: boolean;
  mode: "quick" | "walkthrough";
  /** When set, the form opens in edit mode (PATCH instead of POST). */
  initial?: Habit;
  onClose: () => void;
  onCreated: (habit: { id: number; name: string }) => void;
  onArchived?: (habitId: number) => void;
}

async function createHabit(draft: HabitDraft): Promise<{ id: number; name: string }> {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to create habit");
  }
  return res.json();
}

async function updateHabit(id: number, draft: Partial<HabitDraft>): Promise<{ id: number; name: string }> {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to update habit");
  }
  return res.json();
}

async function archiveHabit(id: number): Promise<void> {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isArchived: true }),
  });
  if (!res.ok) throw new Error("Failed to archive habit");
}

// ─── Module-level sub-components ──────────────────────────────────────────────
// Must be defined outside HabitForm so React's reconciliation sees a stable
// component identity across re-renders. Inner component definitions cause
// unmount/remount on every parent render, snapping dropdowns closed mid-use.

const NONE_VALUE = "__none__";

interface CueTypeDropdownProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  autoFocus?: boolean;
}

function CueTypeDropdown({ value, onChange, autoFocus }: CueTypeDropdownProps) {
  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger className="w-full text-sm h-8" autoFocus={autoFocus}>
        <SelectValue placeholder="Category (optional)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>None</SelectItem>
        {Object.entries(CUE_TYPE_LABELS).map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface KeystoneCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function KeystoneCheckbox({ id, checked, onChange }: KeystoneCheckboxProps) {
  return (
    <div className="flex items-start gap-2.5 pt-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input mt-0.5 shrink-0 cursor-pointer"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          This is a keystone habit
        </label>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">
          Keystone habits tend to pull other positive changes along with them.
        </p>
      </div>
    </div>
  );
}

function initialDraft(habit?: Habit): Partial<HabitDraft> {
  if (habit) {
    return {
      identity: habit.identity,
      name: habit.name,
      cue: habit.cue ?? undefined,
      cueType: habit.cueType ?? undefined,
      minimumVersion: habit.minimumVersion ?? undefined,
      reward: habit.reward ?? undefined,
      isKeystone: habit.isKeystone ?? false,
      color: habit.color,
    };
  }
  return { color: PRESET_COLORS[0], isKeystone: false };
}

export function HabitForm({ open, mode, initial, onClose, onCreated, onArchived }: HabitFormProps) {
  const isEditing = !!initial;

  const [draft, setDraft] = useState<Partial<HabitDraft>>(() => initialDraft(initial));
  const [walkthroughStep, setWalkthroughStep] = useState<WalkthroughStep>("identity");
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDraft(initialDraft(initial));
    setWalkthroughStep("identity");
    setSubmitting(false);
    setArchiving(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function patch(field: keyof HabitDraft, value: string | boolean | null) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    if (!draft.name?.trim() || !draft.identity?.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = isEditing
        ? await updateHabit(initial!.id, draft as HabitDraft)
        : await createHabit(draft as HabitDraft);
      reset();
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!initial) return;
    setArchiving(true);
    setError(null);
    try {
      await archiveHabit(initial.id);
      reset();
      onArchived?.(initial.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setArchiving(false);
    }
  }

  // ─── Quick mode ──────────────────────────────────────────────────────────────

  if (mode === "quick") {
    const canSubmit =
      (draft.name?.trim().length ?? 0) > 0 &&
      (draft.identity?.trim().length ?? 0) > 0;

    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {isEditing ? "Edit habit" : "Add a habit"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-identity">Identity</Label>
              <Textarea
                id="q-identity"
                rows={2}
                placeholder="I am someone who…"
                value={draft.identity ?? ""}
                onChange={(e) => patch("identity", e.target.value)}
                maxLength={200}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-name">Habit name</Label>
              <Input
                id="q-name"
                placeholder="Morning run"
                value={draft.name ?? ""}
                onChange={(e) => patch("name", e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Cue type + text */}
            <div className="flex flex-col gap-1.5">
              <Label>Cue (optional)</Label>
              <CueTypeDropdown value={draft.cueType} onChange={(v) => patch("cueType", v)} />
              <Input
                placeholder="After I make coffee"
                value={draft.cue ?? ""}
                onChange={(e) => patch("cue", e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-min">Two-minute version</Label>
              <Input
                id="q-min"
                placeholder="Put on my shoes and step outside"
                value={draft.minimumVersion ?? ""}
                onChange={(e) => patch("minimumVersion", e.target.value)}
                maxLength={200}
              />
            </div>

            {isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-reward">Reward (optional)</Label>
                <Input
                  id="q-reward"
                  placeholder="calm, clear-headed, energised"
                  value={draft.reward ?? ""}
                  onChange={(e) => patch("reward", e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            {/* Color */}
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <ColorPicker selected={draft.color ?? PRESET_COLORS[0]} onChange={(c) => patch("color", c)} />
            </div>

            <KeystoneCheckbox id="q-keystone" checked={draft.isKeystone ?? false} onChange={(v) => patch("isKeystone", v)} />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 justify-between">
              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleArchive}
                    disabled={archiving || submitting}
                    className="text-muted-foreground"
                  >
                    {archiving ? "Archiving…" : "Archive"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting || archiving}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={!canSubmit || submitting || archiving}
                >
                  {submitting ? "Saving…" : isEditing ? "Save changes" : "Save habit"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Walkthrough mode ─────────────────────────────────────────────────────────

  const currentStepIdx = WALKTHROUGH_STEPS.findIndex((s) => s.id === walkthroughStep);
  const isReview = walkthroughStep === "review";
  const totalSteps = WALKTHROUGH_STEPS.length + 1; // +1 for review

  function nextStep() {
    if (currentStepIdx < WALKTHROUGH_STEPS.length - 1) {
      setWalkthroughStep(WALKTHROUGH_STEPS[currentStepIdx + 1].id);
    } else {
      setWalkthroughStep("review");
    }
  }

  function prevStep() {
    if (isReview) {
      setWalkthroughStep(WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length - 1].id);
    } else if (currentStepIdx > 0) {
      setWalkthroughStep(WALKTHROUGH_STEPS[currentStepIdx - 1].id);
    }
  }

  const stepNumber = isReview ? totalSteps : currentStepIdx + 1;
  const currentStep = isReview ? null : WALKTHROUGH_STEPS[currentStepIdx];
  const currentValue = currentStep ? (draft[currentStep.field] ?? "") : "";
  const canProceed =
    !currentStep?.required || (currentValue as string).trim().length > 0;

  const isCueStep = currentStep?.id === "cue";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-base">
              {isReview ? "Review your habit" : currentStep?.label}
            </DialogTitle>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {stepNumber}/{totalSteps}
            </span>
          </div>
        </DialogHeader>

        {/* Step indicator dots */}
        <div className="flex gap-1.5 -mt-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ${
                i < stepNumber ? "bg-foreground/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {/* ── Step content ── */}
          {!isReview && currentStep && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              {currentStep.subtitle && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentStep.subtitle}
                </p>
              )}
              {/* Cue type dropdown — only shown on the cue step; autoFocus keeps keyboard users on a focused element */}
              {isCueStep && (
                <CueTypeDropdown
                  value={draft.cueType}
                  onChange={(v) => patch("cueType", v)}
                  autoFocus
                />
              )}
              {currentStep.multiline ? (
                <Textarea
                  rows={3}
                  placeholder={currentStep.placeholder}
                  value={currentValue as string}
                  onChange={(e) => patch(currentStep.field, e.target.value)}
                  maxLength={200}
                  className="resize-none text-sm"
                  autoFocus
                />
              ) : (
                <Input
                  placeholder={currentStep.placeholder}
                  value={currentValue as string}
                  onChange={(e) => patch(currentStep.field, e.target.value)}
                  maxLength={currentStep.field === "name" ? 50 : 200}
                  autoFocus={!isCueStep}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canProceed) nextStep();
                  }}
                />
              )}
            </div>
          )}

          {/* ── Review ── */}
          {isReview && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <ReviewRow
                label="Identity"
                value={draft.identity}
                onEdit={() => setWalkthroughStep("identity")}
              />
              <ReviewRow
                label="Name"
                value={draft.name}
                onEdit={() => setWalkthroughStep("name")}
              />
              {draft.cue && (
                <ReviewRow
                  label="Cue"
                  value={draft.cueType ? `${CUE_TYPE_LABELS[draft.cueType] ?? draft.cueType}: ${draft.cue}` : draft.cue}
                  onEdit={() => setWalkthroughStep("cue")}
                />
              )}
              {draft.minimumVersion && (
                <ReviewRow
                  label="Two-minute version"
                  value={draft.minimumVersion}
                  onEdit={() => setWalkthroughStep("minimumVersion")}
                />
              )}
              {draft.reward && (
                <ReviewRow
                  label="Reward"
                  value={draft.reward}
                  onEdit={() => setWalkthroughStep("reward")}
                />
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Color</span>
                <ColorPicker
                  selected={draft.color ?? PRESET_COLORS[0]}
                  onChange={(c) => patch("color", c)}
                />
              </div>
              <KeystoneCheckbox id="wt-keystone" checked={draft.isKeystone ?? false} onChange={(v) => patch("isKeystone", v)} />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* ── Navigation ── */}
          <div className="flex items-center gap-2 justify-between pt-1">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={prevStep} disabled={currentStepIdx === 0 && !isReview}>
                Back
              </Button>
              {!currentStep?.required && !isReview && (
                <Button variant="ghost" size="sm" onClick={nextStep} className="text-muted-foreground">
                  Skip
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isReview && (
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground text-xs">
                  Cancel
                </Button>
              )}
              {isReview ? (
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={submitting || !draft.name?.trim() || !draft.identity?.trim()}
                >
                  {submitting ? "Saving…" : "Create habit"}
                </Button>
              ) : (
                <Button size="sm" onClick={nextStep} disabled={!canProceed}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ColorPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={selected === color}
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full transition-all duration-150 hover:scale-110 active:scale-95 ${
            selected === color
              ? "ring-2 ring-offset-2 ring-foreground/40 scale-110"
              : ""
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm leading-snug">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
      >
        Edit
      </button>
    </div>
  );
}
