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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BucketKey, SpendingCategory } from "@/types";
import { MoreHorizontal, Plus } from "lucide-react";
import { LucideIcon } from "@/components/ui/lucide-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { CATEGORY_ICONS } from "@/lib/icons";
import { DEFAULT_SPENDING_CATEGORIES } from "@/lib/defaults";

const BUCKET_OPTIONS: { value: BucketKey | "none"; label: string }[] = [
  { value: "none", label: "No bucket" },
  { value: "fixed", label: "Fixed" },
  { value: "invest", label: "Invest" },
  { value: "save", label: "Save" },
  { value: "guilt_free", label: "Guilt-Free" },
];

export function CategoriesPage() {
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("package");
  const [color, setColor] = useState("#6B7280");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCategories().finally(() => setLoading(false));
  }, [fetchCategories]);

  function openAdd() {
    setEditingId(null);
    setName("");
    setIcon("package");
    setColor("#6B7280");
    setDialogOpen(true);
  }

  function openEdit(cat: SpendingCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId != null) {
      const res = await fetch(`/api/spending-categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon || "package",
          color: color || "#6B7280",
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCategories();
      }
    } else {
      const res = await fetch("/api/spending-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon || "package",
          color: color || "#6B7280",
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCategories();
      }
    }
  }

  async function handleArchive(id: number) {
    const res = await fetch(`/api/spending-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
    if (res.ok) fetchCategories();
  }

  async function handleBucketChange(id: number, bucket: BucketKey | "none") {
    const prev = categories.find((c) => c.id === id);
    if (!prev) return;
    const newBucket = bucket === "none" ? null : bucket;
    // Optimistic update
    setCategories((cats) => cats.map((c) => c.id === id ? { ...c, bucket: newBucket } : c));
    const res = await fetch(`/api/spending-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: newBucket }),
    });
    if (!res.ok) {
      // Rollback
      setCategories((cats) => cats.map((c) => c.id === id ? { ...c, bucket: prev.bucket } : c));
    }
  }

  async function handleSeedDefaults() {
    for (const cat of DEFAULT_SPENDING_CATEGORIES) {
      await fetch("/api/spending-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cat),
      });
    }
    fetchCategories();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage your spending categories
        </p>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedDefaults}>
              Start with Defaults
            </Button>
          )}
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-12 text-center">
          Loading...
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <LucideIcon name={cat.icon} size="lg" />
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cat)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleArchive(cat.id)}
                    >
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="h-2 w-8 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <Select
                  value={cat.bucket ?? "none"}
                  onValueChange={(v) => handleBucketChange(cat.id, v as BucketKey | "none")}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Assign bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Edit category" : "Add category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Food"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker icons={CATEGORY_ICONS} value={icon} onChange={setIcon} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                {editingId != null ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
