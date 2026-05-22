import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryBookmarks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// DELETE /api/library/bookmarks/:itemId
// Idempotent — always returns 204, even if no row matched.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { itemId: itemIdStr } = await params;
  const itemId = parseInt(itemIdStr, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  await db
    .delete(libraryBookmarks)
    .where(and(eq(libraryBookmarks.userId, userId), eq(libraryBookmarks.itemId, itemId)));

  return new NextResponse(null, { status: 204 });
}
