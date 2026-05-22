"use client";

import { useState } from "react";
import { Trash2, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LibraryCategoryWithItems, LibraryItem, LibraryItemWithBookmark } from "@/types";
import { LibraryItemRow } from "./library-item-row";
import { LibraryDeleteDialog } from "./library-delete-dialog";
import { LibraryItemPanel } from "./library-item-panel";

interface LibraryCategorySectionProps {
  category: LibraryCategoryWithItems;
  isAdmin?: boolean;
  onBookmarkToggle?: (itemId: number, currentlyBookmarked: boolean) => void;
  onCategoryDeleted?: (categoryId: number) => void;
  onItemAdded?: (categoryId: number, item: LibraryItem) => void;
  onItemUpdated?: (item: LibraryItem) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function LibraryCategorySection({
  category,
  isAdmin,
  onBookmarkToggle,
  onCategoryDeleted,
  onItemAdded,
  onItemUpdated,
  dragHandleProps,
}: LibraryCategorySectionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editItem, setEditItem] = useState<LibraryItem | undefined>(undefined);
  const [items, setItems] = useState(category.items);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDeleteCategory() {
    await fetch(`/api/library/categories/${category.id}`, { method: "DELETE" });
    onCategoryDeleted?.(category.id);
  }

  function handleItemSaved(item: LibraryItem) {
    if (editItem) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...item, isBookmarked: i.isBookmarked } : i))
      );
      onItemUpdated?.(item);
    } else {
      const newItem: LibraryItemWithBookmark = { ...item, isBookmarked: false };
      setItems((prev) => [...prev, newItem]);
      onItemAdded?.(category.id, item);
    }
  }

  function openAddItem() {
    setEditItem(undefined);
    setPanelOpen(true);
  }

  function openEditItem(item: LibraryItem) {
    setEditItem(item);
    setPanelOpen(true);
  }

  function handleDeleteItem(itemId: number) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    await fetch(`/api/library/categories/${category.id}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((i) => i.id) }),
    });
  }

  return (
    <section>
      {/* Sticky category header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 py-3 mb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAdmin && dragHandleProps && (
              <div
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {category.title}
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-md p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
              aria-label="Delete category"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Items — wrapped in DnD context when admin */}
      {isAdmin ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border/50">
              {items.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  onBookmarkToggle={onBookmarkToggle}
                  onEdit={openEditItem}
                  onDeleted={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((item) => (
            <LibraryItemRow key={item.id} item={item} onBookmarkToggle={onBookmarkToggle} />
          ))}
        </div>
      )}

      {/* Admin: Add item */}
      {isAdmin && (
        <div className="pt-4 pb-6">
          <button
            type="button"
            onClick={openAddItem}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      )}

      <LibraryDeleteDialog
        open={deleteOpen}
        title="Delete this category?"
        description={`"${category.title}" and all its items will be permanently removed. This cannot be undone.`}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteCategory}
      />

      <LibraryItemPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        categoryId={category.id}
        initial={editItem}
        onSaved={handleItemSaved}
      />
    </section>
  );
}

// Sortable item row — used only in admin mode
function SortableItemRow({
  item,
  onBookmarkToggle,
  onEdit,
  onDeleted,
}: {
  item: LibraryItemWithBookmark;
  onBookmarkToggle?: (itemId: number, currentlyBookmarked: boolean) => void;
  onEdit: (item: LibraryItem) => void;
  onDeleted: (itemId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    await fetch(`/api/library/items/${item.id}`, { method: "DELETE" });
    onDeleted(item.id);
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LibraryItemRow
        item={item}
        onBookmarkToggle={onBookmarkToggle}
        adminSlot={
          <div className="flex items-center gap-0.5">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="rounded-md p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            {/* Edit */}
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit item"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {/* Delete */}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <LibraryDeleteDialog
              open={deleteOpen}
              title="Delete this item?"
              description={`"${item.title}" will be permanently removed. This cannot be undone.`}
              onClose={() => setDeleteOpen(false)}
              onConfirm={handleDelete}
            />
          </div>
        }
      />
    </div>
  );
}
