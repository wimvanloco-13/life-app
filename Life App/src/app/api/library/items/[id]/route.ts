import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const VALID_TYPES = ["protocol", "exercise", "tip", "concept"] as const;
type ItemType = (typeof VALID_TYPES)[number];

const MAX_LENGTHS: Record<string, number> = {
  title: 100,
  what: 600,
  why: 600,
  how: 1200,
  durationOrReps: 120,
};

// PATCH /api/library/items/:id — admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(libraryItems)
    .where(eq(libraryItems.id, itemId))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Partial<{
    title: string;
    type: ItemType;
    what: string;
    why: string;
    how: string;
    durationOrReps: string | null;
    displayOrder: number;
  }> = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    if (title.length > MAX_LENGTHS.title) return NextResponse.json({ error: `title must be ${MAX_LENGTHS.title} characters or fewer` }, { status: 400 });
    updates.title = title;
  }
  if (body.type !== undefined) {
    if (!VALID_TYPES.includes(body.type as ItemType)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }
    updates.type = body.type as ItemType;
  }
  for (const field of ["what", "why", "how"] as const) {
    if (body[field] !== undefined) {
      const val = String(body[field]).trim();
      if (!val) return NextResponse.json({ error: `${field} cannot be empty` }, { status: 400 });
      if (val.length > MAX_LENGTHS[field]) return NextResponse.json({ error: `${field} must be ${MAX_LENGTHS[field]} characters or fewer` }, { status: 400 });
      updates[field] = val;
    }
  }
  if (body.durationOrReps !== undefined) {
    const val = body.durationOrReps ? String(body.durationOrReps).trim() : null;
    if (val && val.length > MAX_LENGTHS.durationOrReps) {
      return NextResponse.json({ error: `durationOrReps must be ${MAX_LENGTHS.durationOrReps} characters or fewer` }, { status: 400 });
    }
    updates.durationOrReps = val;
  }
  if (body.displayOrder !== undefined) {
    updates.displayOrder = Number(body.displayOrder);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing[0]);
  }

  const result = await db
    .update(libraryItems)
    .set(updates)
    .where(eq(libraryItems.id, itemId))
    .returning();

  return NextResponse.json(result[0]);
}

// DELETE /api/library/items/:id — admin only. Cascades to bookmarks.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  await db.delete(libraryItems).where(eq(libraryItems.id, itemId));
  return new NextResponse(null, { status: 204 });
}
