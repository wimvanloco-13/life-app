"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatEur } from "@/lib/currency";
import type { IncomeEntry } from "@/types";
import { MoreHorizontal, Plus } from "lucide-react";

interface IncomeViewProps {
  month: string;
}

export function IncomeView({ month }: IncomeViewProps) {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/income?month=${month}`);
    const data = await res.json();
    setEntries(data);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    fetchEntries().finally(() => setLoading(false));
  }, [fetchEntries]);

  function openAdd() {
    setEditingId(null);
    setSource("");
    setAmount("");
    setIsRecurring(false);
    setNotes("");
    setDialogOpen(true);
  }

  function openEdit(entry: IncomeEntry) {
    setEditingId(entry.id);
    setEditSource(entry.source);
    setEditAmount(String(entry.amount));
    setEditIsRecurring(entry.isRecurring);
    setEditNotes(entry.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!source.trim() || isNaN(amt) || amt < 0) return;

    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: source.trim(),
        amount: amt,
        month,
        isRecurring,
        notes: notes.trim() || null,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      fetchEntries();
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    const amt = parseFloat(editAmount);
    if (!editSource.trim() || isNaN(amt) || amt < 0) return;

    const res = await fetch(`/api/income/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: editSource.trim(),
        amount: amt,
        month,
        isRecurring: editIsRecurring,
        notes: editNotes.trim() || null,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      fetchEntries();
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
    if (res.ok) fetchEntries();
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Income</CardTitle>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Income
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No income recorded this month.
            </p>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-3">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.source}</span>
                      {entry.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatEur(entry.amount)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(entry)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="pt-4 font-semibold flex justify-between">
                <span>Monthly total</span>
                <span>{formatEur(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Edit income" : "Add income"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editingId != null ? handleEdit : handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                value={editingId != null ? editSource : source}
                onChange={(e) =>
                  editingId != null
                    ? setEditSource(e.target.value)
                    : setSource(e.target.value)
                }
                placeholder="e.g. Salary"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editingId != null ? editAmount : amount}
                onChange={(e) =>
                  editingId != null
                    ? setEditAmount(e.target.value)
                    : setAmount(e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Enter your monthly net income (after taxes and social security).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editingId != null ? editIsRecurring : isRecurring}
                onCheckedChange={(v) =>
                  editingId != null
                    ? setEditIsRecurring(!!v)
                    : setIsRecurring(!!v)
                }
              />
              <Label className="font-normal">Recurring</Label>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={editingId != null ? editNotes : notes}
                onChange={(e) =>
                  editingId != null
                    ? setEditNotes(e.target.value)
                    : setNotes(e.target.value)
                }
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId != null ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
