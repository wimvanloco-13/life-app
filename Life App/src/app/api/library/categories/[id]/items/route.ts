import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryCategories, libraryItems } from "@/db/schema";
import { eq, max } from "drizzle-orm";
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

function validateItemBody(body: Record<string, unknown>): string | null {
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return "title is required";
  }
  if (!body.type || !VALID_TYPES.includes(body.type as ItemType)) {
    return `type must be one of: ${VALID_TYPES.join(", ")}`;
  }
  for (const field of ["what", "why", "how"] as const) {
    if (!body[field] || typeof body[field] !== "string" || !(body[field] as string).trim()) {
      return `${field} is required`;
    }
  }
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const val = body[field];
    if (val && typeof val === "string" && val.length > max) {
      return `${field} must be ${max} characters or fewer`;
    }
  }
  return null;
}

// POST /api/library/categories/:id/items — admin only
export async function POST(
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

  const body = await req.json().catch(() => ({}));
  const error = validateItemBody(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const maxOrder = await db
    .select({ val: max(libraryItems.displayOrder) })
    .from(libraryItems)
    .where(eq(libraryItems.categoryId, categoryId));
  const nextOrder = (maxOrder[0]?.val ?? -1) + 1;

  const result = await db
    .insert(libraryItems)
    .values({
      categoryId,
      title: (body.title as string).trim(),
      type: body.type as ItemType,
      what: (body.what as string).trim(),
      why: (body.why as string).trim(),
      how: (body.how as string).trim(),
      durationOrReps: body.durationOrReps ? (body.durationOrReps as string).trim() : null,
      displayOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
