import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidHexColor } from "@/lib/colors";
import { auth } from "@/lib/auth";

const IDENTITY_MAX = 200;
const NAME_MAX = 50;
const CUE_MAX = 200;
const MINIMUM_VERSION_MAX = 200;
const REWARD_MAX = 200;

const VALID_CUE_TYPES = ["location", "time", "emotional_state", "other_people", "preceding_action"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const habitId = parseInt(id);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid habit ID" }, { status: 400 });

  // Existence check is also the cross-user check: 404 (not 403) if the habit
  // does not exist for this user (spec FR-035).
  const existing = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.identity !== undefined) {
    if (typeof body.identity !== "string" || body.identity.trim().length === 0) {
      return NextResponse.json({ error: "Identity is required" }, { status: 400 });
    }
    if (body.identity.trim().length > IDENTITY_MAX) {
      return NextResponse.json({ error: `Identity must be ${IDENTITY_MAX} characters or less` }, { status: 400 });
    }
    updates.identity = body.identity.trim();
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (body.name.trim().length > NAME_MAX) {
      return NextResponse.json({ error: `Name must be ${NAME_MAX} characters or less` }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.cue !== undefined) {
    if (body.cue === null || body.cue === "") {
      updates.cue = null;
    } else if (typeof body.cue !== "string") {
      return NextResponse.json({ error: "Cue must be a string" }, { status: 400 });
    } else if (body.cue.trim().length > CUE_MAX) {
      return NextResponse.json({ error: `Cue must be ${CUE_MAX} characters or less` }, { status: 400 });
    } else {
      updates.cue = body.cue.trim().length === 0 ? null : body.cue.trim();
    }
  }

  if (body.minimumVersion !== undefined) {
    if (body.minimumVersion === null || body.minimumVersion === "") {
      updates.minimumVersion = null;
    } else if (typeof body.minimumVersion !== "string") {
      return NextResponse.json({ error: "Minimum version must be a string" }, { status: 400 });
    } else if (body.minimumVersion.trim().length > MINIMUM_VERSION_MAX) {
      return NextResponse.json(
        { error: `Minimum version must be ${MINIMUM_VERSION_MAX} characters or less` },
        { status: 400 },
      );
    } else {
      updates.minimumVersion = body.minimumVersion.trim().length === 0 ? null : body.minimumVersion.trim();
    }
  }

  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !isValidHexColor(body.color)) {
      return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
    }
    updates.color = body.color;
  }

  if (body.reward !== undefined) {
    if (body.reward === null || body.reward === "") {
      updates.reward = null;
    } else if (typeof body.reward !== "string") {
      return NextResponse.json({ error: "Reward must be a string" }, { status: 400 });
    } else if (body.reward.trim().length > REWARD_MAX) {
      return NextResponse.json({ error: `Reward must be ${REWARD_MAX} characters or less` }, { status: 400 });
    } else {
      updates.reward = body.reward.trim().length === 0 ? null : body.reward.trim();
    }
  }

  if (body.cueType !== undefined) {
    if (body.cueType === null || body.cueType === "") {
      updates.cueType = null;
    } else if (!(VALID_CUE_TYPES as readonly string[]).includes(body.cueType)) {
      return NextResponse.json({ error: "Invalid cue type." }, { status: 400 });
    } else {
      updates.cueType = body.cueType;
    }
  }

  if (body.isKeystone !== undefined) updates.isKeystone = Boolean(body.isKeystone);

  if (body.isArchived !== undefined) updates.isArchived = Boolean(body.isArchived);
  if (body.displayOrder !== undefined) updates.displayOrder = Number(body.displayOrder);

  const [updated] = await db
    .update(habits)
    .set(updates)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const habitId = parseInt(id);
  if (isNaN(habitId)) return NextResponse.json({ error: "Invalid habit ID" }, { status: 400 });

  // 404 for cross-user delete is the same path as missing: never reveal whether
  // the id exists for another user (spec FR-035, SC-015).
  const existing = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  // The DB foreign-key cascade from habit_logs.habit_id removes all logs
  // automatically (set up in apply-schema.js). No manual log deletion needed.
  await db.delete(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  return new NextResponse(null, { status: 204 });
}
