import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  libraryBookmarks,
  libraryItems,
  libraryCategories,
  libraryTopics,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { BookmarkedItem } from "@/types";

// GET /api/library/bookmarks
// Returns all bookmarked items for the current user, sorted by topic then item display_order.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await db
    .select({
      bookmarkId: libraryBookmarks.id,
      bookmarkedAt: libraryBookmarks.createdAt,
      itemId: libraryItems.id,
      itemTitle: libraryItems.title,
      itemType: libraryItems.type,
      itemWhat: libraryItems.what,
      itemWhy: libraryItems.why,
      itemHow: libraryItems.how,
      itemDurationOrReps: libraryItems.durationOrReps,
      itemDisplayOrder: libraryItems.displayOrder,
      categoryId: libraryCategories.id,
      categoryTitle: libraryCategories.title,
      topicId: libraryTopics.id,
      topicSlug: libraryTopics.slug,
      topicTitle: libraryTopics.title,
      topicIcon: libraryTopics.icon,
      topicDisplayOrder: libraryTopics.displayOrder,
    })
    .from(libraryBookmarks)
    .innerJoin(libraryItems, eq(libraryBookmarks.itemId, libraryItems.id))
    .innerJoin(libraryCategories, eq(libraryItems.categoryId, libraryCategories.id))
    .innerJoin(libraryTopics, eq(libraryCategories.topicId, libraryTopics.id))
    .where(eq(libraryBookmarks.userId, userId))
    .orderBy(asc(libraryTopics.displayOrder), asc(libraryItems.displayOrder));

  const items: BookmarkedItem[] = rows.map((r) => ({
    id: r.itemId,
    categoryId: r.categoryId,
    title: r.itemTitle,
    type: r.itemType as BookmarkedItem["type"],
    what: r.itemWhat,
    why: r.itemWhy,
    how: r.itemHow,
    durationOrReps: r.itemDurationOrReps,
    displayOrder: r.itemDisplayOrder,
    isBookmarked: true,
    topicId: r.topicId,
    topicSlug: r.topicSlug,
    topicTitle: r.topicTitle,
    topicIcon: r.topicIcon,
    categoryTitle: r.categoryTitle,
  }));

  return NextResponse.json(items);
}

// POST /api/library/bookmarks
// Idempotent — always returns 201. Body: { itemId: number }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const itemId = body?.itemId;
  if (!itemId || typeof itemId !== "number") {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  // Verify item exists
  const item = await db
    .select({ id: libraryItems.id })
    .from(libraryItems)
    .where(eq(libraryItems.id, itemId))
    .limit(1);

  if (item.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // INSERT OR IGNORE — idempotent, unique index prevents duplicates
  await db
    .insert(libraryBookmarks)
    .values({ userId, itemId })
    .onConflictDoNothing();

  const row = await db
    .select()
    .from(libraryBookmarks)
    .where(and(eq(libraryBookmarks.userId, userId), eq(libraryBookmarks.itemId, itemId)))
    .limit(1);

  return NextResponse.json(row[0], { status: 201 });
}
