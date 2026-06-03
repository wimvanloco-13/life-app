import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bodyMetrics } from "@/db/schema";
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
  const entryId = Number(id);
  if (!Number.isFinite(entryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json() as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (body.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ error: "Value must be a positive number" }, { status: 400 });
    updates.value = v;
  }
  if (body.date !== undefined) {
    const d = String(body.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(Date.parse(d))) {
      return NextResponse.json({ error: "Date must be a valid YYYY-MM-DD date" }, { status: 400 });
    }
    updates.date = d;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const [updated] = await db
    .update(bodyMetrics)
    .set(updates)
    .where(and(eq(bodyMetrics.id, entryId), eq(bodyMetrics.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const entryId = Number(id);
  if (!Number.isFinite(entryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const deleted = await db
    .delete(bodyMetrics)
    .where(and(eq(bodyMetrics.id, entryId), eq(bodyMetrics.userId, userId)))
    .returning();

  if (deleted.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
