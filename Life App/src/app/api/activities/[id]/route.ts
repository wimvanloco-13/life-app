import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  applyCheckOffBridge,
  applyUnCheckBridge,
  applyDeleteBridge,
  parseBridgedLogAction,
} from "@/lib/activities-bridge";
import { assertOwnership, OwnershipError } from "@/lib/ownership";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid activity ID" }, { status: 400 });

  const existing = await db.select().from(activities).where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  const existingActivity = existing[0];

  const body = await request.json();

  let bridgedAction: { value: "delete" | "unlink" | undefined } = { value: undefined };
  if (body.bridgedLogAction !== undefined) {
    const parsed = parseBridgedLogAction(body.bridgedLogAction);
    if (parsed === null) {
      return NextResponse.json({ error: "bridgedLogAction must be 'delete' or 'unlink'" }, { status: 400 });
    }
    bridgedAction = parsed;
  }

  // Validate ownership of any incoming foreign key IDs before writing.
  if (body.roleId !== undefined || body.goalId !== undefined || body.activityTypeId !== undefined) {
    try {
      await assertOwnership(userId, {
        roleIds: body.roleId != null ? [body.roleId] : [],
        goalId: body.goalId ?? null,
        activityTypeId: body.activityTypeId ?? null,
      });
    } catch (err) {
      if (err instanceof OwnershipError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
  }

  // Only keys listed below are written; omitted fields (e.g. sessionType on date-only PATCH) stay unchanged.
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.quadrant !== undefined) updates.quadrant = body.quadrant;
  if (body.activityDate !== undefined) updates.activityDate = body.activityDate;
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined) updates.endTime = body.endTime;
  if (body.isCompleted !== undefined) updates.isCompleted = Boolean(body.isCompleted);
  if (body.createdFromLog !== undefined) updates.createdFromLog = Boolean(body.createdFromLog);
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.roleId !== undefined) updates.roleId = body.roleId;
  if (body.goalId !== undefined) updates.goalId = body.goalId;
  if (body.activityTypeId !== undefined) updates.activityTypeId = body.activityTypeId;
  if (body.sessionType !== undefined) {
    if (body.sessionType !== "training" && body.sessionType !== "supplemental") {
      return NextResponse.json({ error: "sessionType must be training or supplemental" }, { status: 400 });
    }
    updates.sessionType = body.sessionType;
  }

  // Transitions are computed against the row we just loaded. The bridges
  // run only when isCompleted actually flips. We coerce via Boolean(...)
  // so a truthy non-boolean from the client triggers the bridge the same
  // way it triggers the column update below.
  const newIsCompleted =
    body.isCompleted === undefined
      ? existingActivity.isCompleted
      : Boolean(body.isCompleted);
  const isCheckOff = newIsCompleted === true && existingActivity.isCompleted === false;
  const isUnCheck = newIsCompleted === false && existingActivity.isCompleted === true;

  if (isCheckOff) {
    await applyCheckOffBridge(db, {
      activityId: existingActivity.id,
      userId,
      activityTypeId: existingActivity.activityTypeId,
      goalId: existingActivity.goalId,
      activityDate: existingActivity.activityDate,
    });
  }

  const [updated] = await db.update(activities).set(updates).where(and(eq(activities.id, activityId), eq(activities.userId, userId))).returning();

  if (isUnCheck) {
    await applyUnCheckBridge(db, {
      activityId: existingActivity.id,
      userId,
      action: bridgedAction.value,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid activity ID" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const parsed = parseBridgedLogAction(searchParams.get("bridgedLogAction"));
  if (parsed === null) {
    return NextResponse.json({ error: "bridgedLogAction must be 'delete' or 'unlink'" }, { status: 400 });
  }

  const bridge = await applyDeleteBridge(db, { activityId, userId, action: parsed.value });
  if (bridge.status === 409) {
    return NextResponse.json(
      { error: "bridgedLogActionRequired", linkedLogId: bridge.linkedLogId },
      { status: 409 }
    );
  }

  await db.delete(activities).where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
  return NextResponse.json({ success: true });
}
