"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEur } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import type { PlannedExpense, SpendingCategory } from "@/types";
import { MoreHorizontal, Plus } from "lucide-react";
import { LucideIcon } from "@/components/ui/lucide-icon";

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];

export function BudgetGoals() {
  const currentYear = new Date().getFullYear();

  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const fetchExpenses = useCallback(async () => {
    const res = await fetch(`/api/planned-expenses?year=${currentYear}`);
    const data = await res.json();
    setExpenses(data);
  }, [currentYear]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchExpenses(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchExpenses, fetchCategories]);

  function openAddExpense() {
    setEditingId(null);
    setName("");
    setAmount("");
    setMonth(`${currentYear}-01`);
    setCategoryId("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEditExpense(exp: PlannedExpense) {
    setEditingId(exp.id);
    setName(exp.name);
    setAmount(String(exp.amount));
    setMonth(exp.month);
    setCategoryId(exp.categoryId != null ? String(exp.categoryId) : "");
    setNotes(exp.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt < 0 || !month) return;

    if (editingId != null) {
      const res = await fetch(`/api/planned-expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), amount: amt, month,
          categoryId: categoryId ? Number(categoryId) : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) { setDialogOpen(false); fetchExpenses(); }
    } else {
      const res = await fetch("/api/planned-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), amount: amt, month,
          categoryId: categoryId ? Number(categoryId) : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) { setDialogOpen(false); fetchExpenses(); }
    }
  }

  async function handleDeleteExpense(id: number) {
    const res = await fetch(`/api/planned-expenses/${id}`, { method: "DELETE" });
    if (res.ok) fetchExpenses();
  }

  const monthOptions = MONTHS.map((m) => ({
    value: `${currentYear}-${m}`,
    label: format(parseISO(`${currentYear}-${m}-01`), "MMMM"),
  }));

  const yearlyTotal = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Planned Expenses</CardTitle>
            <CardDescription>
              One-off and annual costs planned for {currentYear}
            </CardDescription>
          </div>
          <Button onClick={openAddExpense} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No planned expenses for {currentYear}.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div>Name</div>
                  <div className="text-right">Amount</div>
                  <div>Month</div>
                  <div>Category</div>
                  <div>Notes</div>
                  <div className="w-10" />
                </div>
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="grid grid-cols-[1fr_auto_auto_1fr_1fr_auto] gap-4 px-4 py-3 border-t items-center text-sm"
                  >
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-right">{formatEur(exp.amount)}</div>
                    <div>{format(parseISO(exp.month + "-01"), "MMM yyyy")}</div>
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      {exp.categoryName ? (
                        <>
                          <LucideIcon name={exp.categoryIcon ?? "package"} size="sm" />
                          {exp.categoryName}
                        </>
                      ) : "—"}
                    </div>
                    <div className="text-muted-foreground truncate max-w-[120px]">
                      {exp.notes ?? "—"}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditExpense(exp)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDeleteExpense(exp.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t">
                <span className="font-semibold text-sm">
                  Yearly total: {formatEur(yearlyTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Edit planned expense" : "Add planned expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Car service"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (€)</Label>
              <Input
                type="number" min={0} step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2">
                        <LucideIcon name={c.icon} size="sm" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId != null ? "Save" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
