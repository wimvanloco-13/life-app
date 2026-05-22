import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function resolveCategory(idStr: string) {
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return null;
  const rows = await db
    .select()
    .from(libraryCategories)
    .where(eq(libraryCategories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// PATCH /api/library/categories/:id — admin only
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
  const category = await resolveCategory(id);
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: { title?: string; displayOrder?: number } = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    if (title.length > 80) return NextResponse.json({ error: "title must be 80 characters or fewer" }, { status: 400 });
    updates.title = title;
  }
  if (body.displayOrder !== undefined) {
    updates.displayOrder = Number(body.displayOrder);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(category);
  }

  const result = await db
    .update(libraryCategories)
    .set(updates)
    .where(eq(libraryCategories.id, category.id))
    .returning();

  return NextResponse.json(result[0]);
}

// DELETE /api/library/categories/:id — admin only. Cascades to items + bookmarks.
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
  const category = await resolveCategory(id);
  if (!category) {
    return new NextResponse(null, { status: 204 }); // idempotent
  }

  await db.delete(libraryCategories).where(eq(libraryCategories.id, category.id));
  return new NextResponse(null, { status: 204 });
}
