"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Swords,
  Mountain,
  Footprints,
  BookOpen,
  Wind,
  BookMarked,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  LibraryTopicWithCategories,
  LibraryCategoryWithItems,
  LibraryItemWithBookmark,
  LibraryItem,
} from "@/types";
import { LibraryCategorySection } from "./library-category-section";
import { LibraryEmptyState } from "./library-empty-state";

const ICON_MAP: Record<string, LucideIcon> = {
  Swords,
  Mountain,
  Footprints,
  BookOpen,
  Wind,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? BookMarked;
}

interface LibraryTopicPageProps {
  slug: string;
}

export function LibraryTopicPage({ slug }: LibraryTopicPageProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [topic, setTopic] = useState<LibraryTopicWithCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);

  const fetchTopic = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/library/topics/${slug}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error("Failed to load");
      setTopic(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchTopic(); }, [fetchTopic]);

  // ─── Bookmark toggle ──────────────────────────────────────────────────────
  const handleBookmarkToggle = useCallback(
    async (itemId: number, currentlyBookmarked: boolean) => {
      setTopic((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item): LibraryItemWithBookmark =>
              item.id === itemId ? { ...item, isBookmarked: !currentlyBookmarked } : item
            ),
          })),
        };
      });
      try {
        if (currentlyBookmarked) {
          await fetch(`/api/library/bookmarks/${itemId}`, { method: "DELETE" });
        } else {
          await fetch("/api/library/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId }),
          });
        }
      } catch {
        setTopic((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            categories: prev.categories.map((cat) => ({
              ...cat,
              items: cat.items.map((item): LibraryItemWithBookmark =>
                item.id === itemId ? { ...item, isBookmarked: currentlyBookmarked } : item
              ),
            })),
          };
        });
      }
    },
    []
  );

  // ─── Admin: category deleted ──────────────────────────────────────────────
  const handleCategoryDeleted = useCallback((categoryId: number) => {
    setTopic((prev) => {
      if (!prev) return prev;
      return { ...prev, categories: prev.categories.filter((c) => c.id !== categoryId) };
    });
  }, []);

  // ─── Admin: item added ────────────────────────────────────────────────────
  const handleItemAdded = useCallback((categoryId: number, item: LibraryItem) => {
    setTopic((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map((cat): LibraryCategoryWithItems =>
          cat.id === categoryId
            ? { ...cat, items: [...cat.items, { ...item, isBookmarked: false }] }
            : cat
        ),
      };
    });
  }, []);

  // ─── Admin: item updated ──────────────────────────────────────────────────
  const handleItemUpdated = useCallback((updated: LibraryItem) => {
    setTopic((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map((cat): LibraryCategoryWithItems => ({
          ...cat,
          items: cat.items.map((item): LibraryItemWithBookmark =>
            item.id === updated.id ? { ...updated, isBookmarked: item.isBookmarked } : item
          ),
        })),
      };
    });
  }, []);

  // ─── Admin: add category ──────────────────────────────────────────────────
  async function handleAddCategory() {
    const title = prompt("Category title:");
    if (!title?.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch(`/api/library/topics/${slug}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) return;
      const newCat = await res.json();
      setTopic((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: [...prev.categories, { ...newCat, items: [] }],
        };
      });
    } finally {
      setAddingCategory(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <LibraryTopicSkeleton />;

  if (notFound) {
    return (
      <LibraryEmptyState
        icon={BookMarked}
        title="Topic not found"
        description="This section hasn't been set up yet."
      />
    );
  }

  if (!topic) return null;

  const Icon = resolveIcon(topic.icon);
  const isEmpty = topic.categories.length === 0;

  return (
    <div className="px-6 py-8 max-w-3xl animate-fade-in">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {topic.title}
          </h1>
        </div>
        {topic.description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            {topic.description}
          </p>
        )}
      </header>

      {isEmpty && !isAdmin ? (
        <LibraryEmptyState
          icon={Icon}
          title="Nothing here yet"
          description="Content for this topic hasn't been added yet."
        />
      ) : (
        <div className="space-y-10">
          {topic.categories.map((category) => (
            <LibraryCategorySection
              key={category.id}
              category={category}
              isAdmin={isAdmin}
              onBookmarkToggle={handleBookmarkToggle}
              onCategoryDeleted={handleCategoryDeleted}
              onItemAdded={handleItemAdded}
              onItemUpdated={handleItemUpdated}
            />
          ))}

          {isAdmin && (
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addingCategory}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add category
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LibraryTopicSkeleton() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-8 w-40 rounded" />
      </div>
      <Skeleton className="h-4 w-72 rounded mb-10" />
      {[0, 1].map((i) => (
        <div key={i} className="mb-10">
          <Skeleton className="h-4 w-32 rounded mb-4" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="py-6 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-48 rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-3 w-10 rounded mt-2" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
