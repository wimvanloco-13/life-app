"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { HabitWithRecentLogs } from "@/types";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HabitDeleteDialog } from "./habit-delete-dialog";
import { HabitEmptyState } from "./habit-empty-state";
import { HabitForm } from "./habit-form";
import { HabitPrinciples } from "./habit-principles";
import { HabitRow } from "./habit-row";

const AFFIRMATIONS = [
  "That's the streak.",
  "One more vote for the identity.",
  "Done. That's who you are.",
  "Present.",
  "Habit honored.",
  "Another day, another rep.",
  "Consistent.",
];

function pickAffirmation(minimumVersion?: string | null): string {
  if (minimumVersion) return minimumVersion;
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

function getLocalToday(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function HabitList() {
  const [activeHabits, setActiveHabits] = useState<HabitWithRecentLogs[]>([]);
  const [archivedHabits, setArchivedHabits] = useState<HabitWithRecentLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [today] = useState<string>(getLocalToday);
  const [showArchived, setShowArchived] = useState(false);

  const [logDates, setLogDates] = useState<Record<number, string[]>>({});
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());
  const [affirmations, setAffirmations] = useState<Record<number, string | null>>({});
  const [errors, setErrors] = useState<Record<number, string | null>>({});
  const [reorderError, setReorderError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"quick" | "walkthrough" | null>(null);
  const [editingHabit, setEditingHabit] = useState<HabitWithRecentLogs | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HabitWithRecentLogs | null>(null);

  // ── DnD sensors ─────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchHabits = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/habits?archived=true"),
      ]);
      if (!activeRes.ok) throw new Error();
      const activeData: HabitWithRecentLogs[] = await activeRes.json();
      const archivedData: HabitWithRecentLogs[] = archivedRes.ok
        ? await archivedRes.json()
        : [];

      setActiveHabits(activeData);
      setArchivedHabits(archivedData);

      const initial: Record<number, string[]> = {};
      for (const h of [...activeData, ...archivedData]) initial[h.id] = h.recentLogDates;
      setLogDates(initial);
    } catch {
      setFetchError("Could not load habits. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (habitId: number, date: string) => {
      const key = `${habitId}:${date}`;
      if (inFlight.has(key)) return;

      const current = logDates[habitId] ?? [];
      const alreadyLogged = current.includes(date);

      setLogDates((prev) => {
        const dates = prev[habitId] ?? [];
        return {
          ...prev,
          [habitId]: alreadyLogged
            ? dates.filter((d) => d !== date)
            : [...dates, date].sort(),
        };
      });

      setInFlight((prev) => new Set([...prev, key]));

      if (!alreadyLogged && date === today) {
        const habit = activeHabits.find((h) => h.id === habitId);
        const text = pickAffirmation(habit?.minimumVersion);
        setAffirmations((prev) => ({ ...prev, [habitId]: text }));
        setTimeout(() => {
          setAffirmations((prev) => ({ ...prev, [habitId]: null }));
        }, 2200);
      }

      try {
        const res = await fetch("/api/habit-logs", {
          method: alreadyLogged ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId, date }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setLogDates((prev) => {
          const dates = prev[habitId] ?? [];
          return {
            ...prev,
            [habitId]: alreadyLogged
              ? [...dates, date].sort()
              : dates.filter((d) => d !== date),
          };
        });
        setAffirmations((prev) => ({ ...prev, [habitId]: null }));
        setErrors((prev) => ({
          ...prev,
          [habitId]: "Could not save. Tap to retry.",
        }));
        setTimeout(() => {
          setErrors((prev) => ({ ...prev, [habitId]: null }));
        }, 5000);
      } finally {
        setInFlight((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [activeHabits, inFlight, logDates, today],
  );

  // ── Drag to reorder ────────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeHabits.findIndex((h) => h.id === active.id);
    const newIndex = activeHabits.findIndex((h) => h.id === over.id);
    const reordered = arrayMove(activeHabits, oldIndex, newIndex);

    setActiveHabits(reordered);

    try {
      const res = await fetch("/api/habits/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((h) => h.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActiveHabits(activeHabits);
      setReorderError("Could not save order. Please try again.");
      setTimeout(() => setReorderError(null), 5000);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function handleEditOpen(habit: HabitWithRecentLogs) {
    setEditingHabit(habit);
    setFormMode("quick");
  }

  function handleFormCreatedOrUpdated(result: { id: number; name: string }) {
    void result;
    setFormMode(null);
    setEditingHabit(null);
    fetchHabits();
  }

  // ── Archive ────────────────────────────────────────────────────────────────

  async function handleArchive(habit: HabitWithRecentLogs) {
    // Optimistic: remove from active, add to archived
    setActiveHabits((prev) => prev.filter((h) => h.id !== habit.id));
    setArchivedHabits((prev) => [{ ...habit, isArchived: true }, ...prev]);

    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActiveHabits((prev) =>
        [...prev, habit].sort((a, b) => a.displayOrder - b.displayOrder),
      );
      setArchivedHabits((prev) => prev.filter((h) => h.id !== habit.id));
    }
  }

  // Called when the Archive button inside HabitForm is clicked
  function handleArchivedViaForm(habitId: number) {
    const habit = activeHabits.find((h) => h.id === habitId);
    setFormMode(null);
    setEditingHabit(null);
    if (habit) handleArchive(habit);
  }

  // ── Restore ────────────────────────────────────────────────────────────────

  async function handleRestore(habit: HabitWithRecentLogs) {
    setArchivedHabits((prev) => prev.filter((h) => h.id !== habit.id));
    setActiveHabits((prev) =>
      [...prev, { ...habit, isArchived: false }].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      ),
    );

    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActiveHabits((prev) => prev.filter((h) => h.id !== habit.id));
      setArchivedHabits((prev) =>
        [...prev, habit].sort((a, b) => a.displayOrder - b.displayOrder),
      );
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(habit: HabitWithRecentLogs) {
    const res = await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");

    if (habit.isArchived) {
      setArchivedHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } else {
      setActiveHabits((prev) => prev.filter((h) => h.id !== habit.id));
    }
    setDeleteTarget(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <HabitListSkeleton />;

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">{fetchError}</p>
      </div>
    );
  }

  // Empty state gets its own full-page layout — no header bar
  if (activeHabits.length === 0 && archivedHabits.length === 0) {
    return (
      <>
        <HabitEmptyState
          onQuick={() => { setEditingHabit(null); setFormMode("quick"); }}
          onWalkthrough={() => { setEditingHabit(null); setFormMode("walkthrough"); }}
        />
        {formMode && (
          <HabitForm
            open
            mode={formMode}
            onClose={() => { setFormMode(null); setEditingHabit(null); }}
            onCreated={handleFormCreatedOrUpdated}
          />
        )}
      </>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_260px] gap-12 animate-fade-up items-start">
      {/* ── Left column: habit list ── */}
      <div className="flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Habits</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditingHabit(null); setFormMode("walkthrough"); }}
              className="text-muted-foreground text-xs"
            >
              Walk me through it
            </Button>
            <Button size="sm" onClick={() => { setEditingHabit(null); setFormMode("quick"); }}>
              + Add habit
            </Button>
          </div>
        </div>

        {/* Reorder error */}
        {reorderError && (
          <p className="text-xs text-destructive mb-3">{reorderError}</p>
        )}

        {/* Active list */}
        <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeHabits.map((h) => h.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {activeHabits.map((habit, i) => (
              <div key={habit.id}>
                <HabitRow
                  habit={habit}
                  logDates={logDates[habit.id] ?? []}
                  today={today}
                  inFlightDates={
                    new Set(
                      [...inFlight]
                        .filter((k) => k.startsWith(`${habit.id}:`))
                        .map((k) => k.split(":").slice(1).join(":")),
                    )
                  }
                  affirmation={affirmations[habit.id]}
                  error={errors[habit.id]}
                  onToggle={handleToggle}
                  onEdit={() => handleEditOpen(habit)}
                  onArchiveToggle={() => handleArchive(habit)}
                  onDelete={() => setDeleteTarget(habit)}
                />
                {i < activeHabits.length - 1 && (
                  <Separator className="opacity-40" />
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

        {/* Archive section */}
        {archivedHabits.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              {showArchived ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              Show archived habits ({archivedHabits.length})
            </button>

            {showArchived && (
              <div className="flex flex-col">
                {archivedHabits.map((habit, i) => (
                  <div key={habit.id}>
                    <HabitRow
                      habit={habit}
                      logDates={logDates[habit.id] ?? []}
                      today={today}
                      inFlightDates={new Set()}
                      onToggle={() => {}}
                      onEdit={() => {}}
                      onArchiveToggle={() => handleRestore(habit)}
                      onDelete={() => setDeleteTarget(habit)}
                    />
                    {i < archivedHabits.length - 1 && (
                      <Separator className="opacity-20" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forms */}
        {formMode && (
          <HabitForm
            open
            mode={formMode}
            initial={editingHabit ?? undefined}
            onClose={() => { setFormMode(null); setEditingHabit(null); }}
            onCreated={handleFormCreatedOrUpdated}
            onArchived={handleArchivedViaForm}
          />
        )}

        {/* Delete confirmation */}
        {deleteTarget && (
          <HabitDeleteDialog
            open
            habitName={deleteTarget.name}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => handleDelete(deleteTarget)}
          />
        )}
      </div>

      {/* ── Right column: principles sidebar ── */}
      <aside className="pt-[52px] border-l border-border/50 pl-10">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium mb-5">
          Principles
        </p>
        <HabitPrinciples compact />
      </aside>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HabitListSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between pb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center gap-4 py-4">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-2 h-2 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-5 w-[286px]" />
            <Skeleton className="h-5 w-14" />
          </div>
          {i < 3 && <Separator className="opacity-40" />}
        </div>
      ))}
    </div>
  );
}

