import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryCategories, libraryItems } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

// PUT /api/library/categories/:id/reorder — admin only
// Body: { order: number[] } — array of item IDs in desired display order
export async function PUT(
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
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  const category = await db
    .select({ id: libraryCategories.id })
    .from(libraryCategories)
    .where(eq(libraryCategories.id, categoryId))
    .limit(1);

  if (category.length === 0) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.order) || body.order.some((v: unknown) => typeof v !== "number")) {
    return NextResponse.json({ error: "order must be an array of item IDs" }, { status: 400 });
  }
  const order: number[] = body.order;

  // Verify all IDs belong to this category
  const items = await db
    .select({ id: libraryItems.id })
    .from(libraryItems)
    .where(and(eq(libraryItems.categoryId, categoryId), inArray(libraryItems.id, order)));

  if (items.length !== order.length) {
    return NextResponse.json({ error: "One or more item IDs do not belong to this category" }, { status: 400 });
  }

  // Update display_order in a transaction
  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx
        .update(libraryItems)
        .set({ displayOrder: i })
        .where(eq(libraryItems.id, order[i]));
    }
  });

  return NextResponse.json({ ok: true });
}
