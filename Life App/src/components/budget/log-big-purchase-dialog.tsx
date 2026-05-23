"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import type { MomentDecision, SpendingCategory } from "@/types";
import { useEffect } from "react";

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = "preflight" | "scorecard" | "utility-status" | "six-month" | "decision";
const STEPS: Step[] = ["preflight", "scorecard", "utility-status", "six-month", "decision"];

// ─── Housel framing copy (from housel-framings.md) ────────────────────────────

const FILTER_FRAMES = {
  scorecard: {
    heading: "The Inner Scorecard",
    framing:
      "Warren Buffett distinguishes between people who measure success by their own values (inner scorecard) and those who measure it by others' opinions (outer scorecard). Almost all durable happiness from spending comes from the inner scorecard. The outer scorecard is unwinnable — there is always someone with more, a newer model, or a bigger house.",
    prompt:
      "Is this purchase for you, or partly to signal something to others? Write down your honest answer — even a single sentence is enough.",
  },
  "utility-status": {
    heading: "Utility vs. Status",
    framing:
      "Every significant purchase has two components: utility (how it functions in your life) and status (how it signals something to others). Most expensive purchases are a mix of both. The status portion is almost always the part that disappoints the fastest — because others stop noticing within weeks, and so do you.",
    prompt:
      "Which part of this purchase is utility, and which part is status? You don't have to choose one — just name both portions honestly.",
  },
  "six-month": {
    heading: "In Six Months",
    framing:
      "The brain adapts to any new baseline within roughly three months. Before a large purchase, ask how you will feel about it in six months \u2014 not in six days. If the honest answer is \u201cI probably won\u2019t notice it,\u201d that is the answer.",
    prompt:
      "How do you think you'll feel about this in six months? Will it still matter, or will it have become part of the background?",
  },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface LogBigPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  momentThreshold?: number;
  onSaved?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LogBigPurchaseDialog({
  open,
  onOpenChange,
  momentThreshold = 200,
  onSaved,
}: LogBigPurchaseDialogProps) {
  const [step, setStep] = useState<Step>("preflight");
  const [categories, setCategories] = useState<SpendingCategory[]>([]);

  // Preflight fields
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("_none");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Filter answers
  const [scorecardAnswer, setScorecardAnswer] = useState("");
  const [utilityStatusAnswer, setUtilityStatusAnswer] = useState("");
  const [sixMonthAnswer, setSixMonthAnswer] = useState("");

  // Decision
  const [decision, setDecision] = useState<MomentDecision>("proceeded");
  const [alsoLogAsSpending, setAlsoLogAsSpending] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
      // Reset all state when dialog opens
      setStep("preflight");
      setAmount("");
      setDescription("");
      setCategoryId("_none");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setScorecardAnswer("");
      setUtilityStatusAnswer("");
      setSixMonthAnswer("");
      setDecision("proceeded");
      setAlsoLogAsSpending(true);
      setError("");
    }
  }, [open, fetchCategories]);

  const stepIndex = STEPS.indexOf(step) + 1;
  const amountNum = parseFloat(amount);
  const belowThreshold = !isNaN(amountNum) && amountNum > 0 && amountNum < momentThreshold;

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/moment-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          description: description.trim(),
          date,
          categoryId: categoryId && categoryId !== "_none" ? categoryId : null,
          scorecardAnswer: scorecardAnswer.trim() || null,
          utilityStatusAnswer: utilityStatusAnswer.trim() || null,
          sixMonthAnswer: sixMonthAnswer.trim() || null,
          decision,
          alsoLogAsSpending: decision === "proceeded" && alsoLogAsSpending,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)]">
            Log a big purchase
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepIndex ? "bg-foreground" : "bg-muted"
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1 shrink-0">
            Step {stepIndex} of {STEPS.length}
          </span>
        </div>

        <div className="space-y-5 py-1">
          {/* ── Step 1: Preflight ───────────────────────────────── */}
          {step === "preflight" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">What are you considering buying?</p>
                <p className="text-xs text-muted-foreground">
                  Fill in the basics, then work through three short reflection steps.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Amount (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 800"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                {belowThreshold && (
                  <p className="text-xs text-muted-foreground">
                    Below your €{momentThreshold} threshold — you can still log it, but no filters are required.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>What is it?</Label>
                <Input
                  placeholder="e.g. New laptop, weekend trip, jacket"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={categories.length === 0 ? "No categories — add one in the Categories tab" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={goNext}
                  disabled={!description.trim() || isNaN(amountNum) || amountNum <= 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Steps 2–4: Housel filters ──────────────────────── */}
          {(step === "scorecard" || step === "utility-status" || step === "six-month") && (() => {
            const frame = FILTER_FRAMES[step];
            const [answer, setAnswer] =
              step === "scorecard"
                ? [scorecardAnswer, setScorecardAnswer]
                : step === "utility-status"
                  ? [utilityStatusAnswer, setUtilityStatusAnswer]
                  : [sixMonthAnswer, setSixMonthAnswer];
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold font-[family-name:var(--font-display)]">
                    {frame.heading}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {frame.framing}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{frame.prompt}</Label>
                  <Textarea
                    placeholder="Your thoughts…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={goNext}>
                      Skip
                    </Button>
                    <Button size="sm" onClick={goNext}>
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Step 5: Decision ────────────────────────────────── */}
          {step === "decision" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold font-[family-name:var(--font-display)]">
                  Your decision
                </p>
                <p className="text-xs text-muted-foreground">
                  {description.trim()} — {isNaN(amountNum) ? "€?" : `€${amountNum.toFixed(2)}`}
                </p>
              </div>

              <div className="space-y-2">
                {(["proceeded", "declined", "parked"] as MomentDecision[]).map((d) => (
                  <label
                    key={d}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                      decision === d
                        ? "border-foreground/40 bg-muted/30"
                        : "border-border/50 hover:bg-muted/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={d}
                      checked={decision === d}
                      onChange={() => setDecision(d)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium capitalize">{d}</p>
                      <p className="text-xs text-muted-foreground">
                        {d === "proceeded"
                          ? "You bought it — or you're going to."
                          : d === "declined"
                            ? "You decided not to buy it."
                            : "You're not sure yet. Revisit later."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {decision === "proceeded" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="log-spending"
                    checked={alsoLogAsSpending}
                    onCheckedChange={(v) => setAlsoLogAsSpending(!!v)}
                  />
                  <label htmlFor="log-spending" className="text-sm cursor-pointer">
                    Also log as a spending entry
                  </label>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={goBack}>
                  Back
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
