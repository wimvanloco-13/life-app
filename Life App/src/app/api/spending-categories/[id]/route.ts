import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

  const existing = await db.select().from(spendingCategories).where(and(eq(spendingCategories.id, categoryId), eq(spendingCategories.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = body.name.trim();
  }
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;
  if (body.displayOrder !== undefined) updates.displayOrder = Number(body.displayOrder);
  if (body.isArchived !== undefined) updates.isArchived = Boolean(body.isArchived);
  if (body.bucket !== undefined) {
    const validBuckets = ["fixed", "invest", "save", "guilt_free", null];
    if (!validBuckets.includes(body.bucket)) {
      return NextResponse.json({ error: "bucket must be one of: fixed, invest, save, guilt_free, or null" }, { status: 400 });
    }
    updates.bucket = body.bucket;
  }

  const [updated] = await db.update(spendingCategories).set(updates).where(and(eq(spendingCategories.id, categoryId), eq(spendingCategories.userId, userId))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

  const existing = await db.select().from(spendingCategories).where(and(eq(spendingCategories.id, categoryId), eq(spendingCategories.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  await db.delete(spendingCategories).where(and(eq(spendingCategories.id, categoryId), eq(spendingCategories.userId, userId)));
  return new NextResponse(null, { status: 204 });
}
