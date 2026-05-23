"use client";

import { useState } from "react";
import { formatEur } from "@/lib/currency";
import type { Target25x } from "@/types";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Budget25xCardProps {
  target25x: Target25x;
  statePensionAnnualAmount: number | null;
  onSave: (targetAnnualSpending: number | null, statePensionAnnualAmount: number | null) => Promise<void>;
}

export function Budget25xCard({ target25x, statePensionAnnualAmount, onSave }: Budget25xCardProps) {
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState(
    target25x.overrideAnnualSpending != null ? String(target25x.overrideAnnualSpending) : ""
  );
  const [pensionInput, setPensionInput] = useState(
    statePensionAnnualAmount != null ? String(statePensionAnnualAmount) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const targetVal = targetInput.trim() === "" ? null : Math.max(0, Number(targetInput));
    const pensionVal = pensionInput.trim() === "" ? null : Math.max(0, Number(pensionInput));
    await onSave(targetVal, pensionVal);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setTargetInput(target25x.overrideAnnualSpending != null ? String(target25x.overrideAnnualSpending) : "");
    setPensionInput(statePensionAnnualAmount != null ? String(statePensionAnnualAmount) : "");
    setEditing(false);
  }

  const hasStateAdjustment = target25x.adjustedTarget !== target25x.target;

  return (
    <div className="rounded-xl bg-muted/20 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            25× Target
          </h3>
          <p className="text-xs text-muted-foreground">
            {target25x.overrideAnnualSpending != null
              ? "Using manual annual spending"
              : target25x.computedAnnualSpending != null
                ? "Based on last 12 months of actual spending"
                : "No spending data yet"}
          </p>
        </div>
        {!editing && (
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="shrink-0 -mt-1 -mr-1 h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Annual spending override (leave blank to use computed)</Label>
            <Input
              type="number"
              min="0"
              placeholder={target25x.computedAnnualSpending != null ? `Computed: ${formatEur(target25x.computedAnnualSpending)}` : "e.g. 36000"}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Belgian state pension annual amount (reduces target)</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 12000"
              value={pensionInput}
              onChange={(e) => setPensionInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
              {formatEur(target25x.adjustedTarget > 0 ? target25x.adjustedTarget : target25x.target)}
            </p>
            {hasStateAdjustment && target25x.adjustedTarget > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjusted for state pension · gross target {formatEur(target25x.target)}
              </p>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Annual spending: {formatEur(target25x.activeAnnualSpending)}</p>
            {statePensionAnnualAmount != null && statePensionAnnualAmount > 0 && (
              <p>State pension offset: −{formatEur(statePensionAnnualAmount)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
