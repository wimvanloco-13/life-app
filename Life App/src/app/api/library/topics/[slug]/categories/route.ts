import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryTopics, libraryCategories } from "@/db/schema";
import { eq, max } from "drizzle-orm";
import { auth } from "@/lib/auth";

// POST /api/library/topics/:slug/categories — admin only
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const title = body?.title?.trim();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > 80) {
    return NextResponse.json({ error: "title must be 80 characters or fewer" }, { status: 400 });
  }

  const topic = await db
    .select({ id: libraryTopics.id })
    .from(libraryTopics)
    .where(eq(libraryTopics.slug, slug))
    .limit(1);

  if (topic.length === 0) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
  const topicId = topic[0].id;

  // Place new category at the end
  const maxOrder = await db
    .select({ val: max(libraryCategories.displayOrder) })
    .from(libraryCategories)
    .where(eq(libraryCategories.topicId, topicId));
  const nextOrder = (maxOrder[0]?.val ?? -1) + 1;

  const result = await db
    .insert(libraryCategories)
    .values({ topicId, title, displayOrder: nextOrder })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}
