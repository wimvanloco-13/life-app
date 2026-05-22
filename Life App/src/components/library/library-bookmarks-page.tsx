"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Swords,
  Mountain,
  Footprints,
  BookOpen,
  Wind,
  Bookmark,
  BookMarked,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookmarkedItem, LibraryItemWithBookmark } from "@/types";
import { LibraryItemRow } from "./library-item-row";
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

interface TopicGroup {
  topicId: number;
  topicSlug: string;
  topicTitle: string;
  topicIcon: string;
  items: BookmarkedItem[];
}

function groupByTopic(items: BookmarkedItem[]): TopicGroup[] {
  const map = new Map<number, TopicGroup>();
  for (const item of items) {
    if (!map.has(item.topicId)) {
      map.set(item.topicId, {
        topicId: item.topicId,
        topicSlug: item.topicSlug,
        topicTitle: item.topicTitle,
        topicIcon: item.topicIcon,
        items: [],
      });
    }
    map.get(item.topicId)!.items.push(item);
  }
  return Array.from(map.values());
}

export function LibraryBookmarksPage() {
  const [items, setItems] = useState<BookmarkedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/library/bookmarks");
      if (!res.ok) return;
      const data: BookmarkedItem[] = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Optimistic bookmark removal — removing from this page means un-bookmarking
  const handleBookmarkToggle = useCallback(
    async (itemId: number, currentlyBookmarked: boolean) => {
      if (!currentlyBookmarked) return; // should not happen on bookmarks page

      // Optimistic removal from list
      setItems((prev) => prev.filter((i) => i.id !== itemId));

      try {
        const res = await fetch(`/api/library/bookmarks/${itemId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("bookmark failed");
      } catch {
        // Revert on failure
        fetchBookmarks();
      }
    },
    [fetchBookmarks]
  );

  if (loading) return <BookmarksSkeleton />;

  const groups = groupByTopic(items);

  return (
    <div className="px-6 py-8 max-w-3xl animate-fade-in">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <Bookmark className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Bookmarks
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Items you&apos;ve saved for quick reference.
        </p>
      </header>

      {groups.length === 0 ? (
        <LibraryEmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the bookmark icon on any item to save it here."
        />
      ) : (
        <div className="space-y-12">
          {groups.map((group) => {
            const Icon = resolveIcon(group.topicIcon);
            return (
              <section key={group.topicId}>
                {/* Topic header */}
                <div className="flex items-center gap-2 mb-1 pb-3 border-b border-border/60">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.6} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {group.topicTitle}
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {group.items.map((item) => (
                    <LibraryItemRow
                      key={item.id}
                      item={item as LibraryItemWithBookmark}
                      onBookmarkToggle={handleBookmarkToggle}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookmarksSkeleton() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-8 w-36 rounded" />
      </div>
      <Skeleton className="h-4 w-56 rounded mb-10" />
      {[0, 1].map((i) => (
        <div key={i} className="mb-12">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          {[0, 1].map((j) => (
            <div key={j} className="py-6 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-48 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
