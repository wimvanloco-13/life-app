import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { momentLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { MomentDecision } from "@/types";

const VALID_DECISIONS: MomentDecision[] = ["proceeded", "declined", "parked"];

async function getOwned(id: number, userId: string) {
  const rows = await db
    .select()
    .from(momentLogs)
    .where(and(eq(momentLogs.id, id), eq(momentLogs.userId, userId)));
  return rows[0] ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await getOwned(logId, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.decision !== undefined) {
    if (!VALID_DECISIONS.includes(body.decision)) {
      return NextResponse.json({ error: "decision must be proceeded, declined, or parked" }, { status: 400 });
    }
    updates.decision = body.decision;
  }
  if (body.scorecardAnswer !== undefined) updates.scorecardAnswer = body.scorecardAnswer?.trim() || null;
  if (body.utilityStatusAnswer !== undefined) updates.utilityStatusAnswer = body.utilityStatusAnswer?.trim() || null;
  if (body.sixMonthAnswer !== undefined) updates.sixMonthAnswer = body.sixMonthAnswer?.trim() || null;

  const [updated] = await db
    .update(momentLogs)
    .set(updates)
    .where(and(eq(momentLogs.id, logId), eq(momentLogs.userId, userId)))
    .returning();

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
  const logId = parseInt(id);
  if (isNaN(logId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = await getOwned(logId, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Intentionally does NOT cascade to spendingEntries (decoupled per spec §3.1)
  await db.delete(momentLogs).where(and(eq(momentLogs.id, logId), eq(momentLogs.userId, userId)));
  return new NextResponse(null, { status: 204 });
}
