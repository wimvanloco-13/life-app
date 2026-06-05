import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { habits, habitLogs } from "@/db/schema";
import { eq, and, asc, gte, inArray, sql } from "drizzle-orm";
import { isValidHexColor } from "@/lib/colors";
import { auth } from "@/lib/auth";

/**
 * Field-level validators kept inline (small, single-file) rather than a shared
 * module because spec FR-007/FR-008 use slightly different messages per field
 * and the create vs patch flows want them surfaced verbatim to the user.
 *
 * Length caps per the spec's "Decisions locked from scope review" table:
 *   identity 200, name 50, cue 200, minimum_version 200.
 */
const IDENTITY_MAX = 200;
const NAME_MAX = 50;
const CUE_MAX = 200;
const MINIMUM_VERSION_MAX = 200;
const REWARD_MAX = 200;

const VALID_CUE_TYPES = ["location", "time", "emotional_state", "other_people", "preceding_action"] as const;

function validateIdentity(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return "Identity is required";
  if (value.trim().length > IDENTITY_MAX) return `Identity must be ${IDENTITY_MAX} characters or less`;
  return null;
}

function validateName(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return "Name is required";
  if (value.trim().length > NAME_MAX) return `Name must be ${NAME_MAX} characters or less`;
  return null;
}

function validateOptionalText(value: unknown, fieldLabel: string, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return `${fieldLabel} must be a string`;
  if (value.trim().length > max) return `${fieldLabel} must be ${max} characters or less`;
  return null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archived") === "true";

  const rows = await db
    .select()
    .from(habits)
    .where(
      and(
        eq(habits.userId, userId),
        eq(habits.isArchived, showArchived),
      ),
    )
    .orderBy(asc(habits.displayOrder), asc(habits.id));

  if (rows.length === 0) return NextResponse.json([]);

  // Recent logs for these habits: capped at 30 days per spec FR-005.
  // The client uses these to build the 14-day strip and run computeStreaks
  // locally with its own "today" (per H1/H3 timezone decisions).
  const habitIds = rows.map((h) => h.id);
  const logRows = await db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, userId),
        inArray(habitLogs.habitId, habitIds),
        gte(habitLogs.date, sql`date('now', '-30 days')`),
      ),
    );

  // Group log dates per habit. Deduplicate (unique index should prevent dupes,
  // but a defensive Set is cheaper than trusting upstream invariants here).
  const byHabit = new Map<number, Set<string>>();
  for (const row of logRows) {
    let set = byHabit.get(row.habitId);
    if (!set) {
      set = new Set<string>();
      byHabit.set(row.habitId, set);
    }
    set.add(row.date);
  }

  const result = rows.map((h) => {
    const set = byHabit.get(h.id);
    const recentLogDates = set ? Array.from(set).sort() : [];
    return { ...h, recentLogDates };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();

  const identityError = validateIdentity(body.identity);
  if (identityError) return NextResponse.json({ error: identityError }, { status: 400 });

  const nameError = validateName(body.name);
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

  const cueError = validateOptionalText(body.cue, "Cue", CUE_MAX);
  if (cueError) return NextResponse.json({ error: cueError }, { status: 400 });

  const minimumVersionError = validateOptionalText(body.minimumVersion, "Minimum version", MINIMUM_VERSION_MAX);
  if (minimumVersionError) return NextResponse.json({ error: minimumVersionError }, { status: 400 });

  if (typeof body.color !== "string" || !isValidHexColor(body.color)) {
    return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
  }

  const rewardError = validateOptionalText(body.reward, "Reward", REWARD_MAX);
  if (rewardError) return NextResponse.json({ error: rewardError }, { status: 400 });

  const cueType = body.cueType ?? null;
  if (cueType !== null && !(VALID_CUE_TYPES as readonly string[]).includes(cueType)) {
    return NextResponse.json({ error: "Invalid cue type." }, { status: 400 });
  }

  // displayOrder is server-computed (spec FR-007). Compute max across active
  // AND archived rows so a restored habit cannot collide with a newly created
  // one. Falls back to -1 when the user has no habits yet, so the first habit
  // lands at 0.
  const existing = await db
    .select({ displayOrder: habits.displayOrder })
    .from(habits)
    .where(eq(habits.userId, userId));
  const maxOrder = existing.reduce((max, h) => Math.max(max, h.displayOrder), -1);

  const [created] = await db
    .insert(habits)
    .values({
      userId,
      identity: (body.identity as string).trim(),
      name: (body.name as string).trim(),
      cue: typeof body.cue === "string" && body.cue.trim().length > 0 ? body.cue.trim() : null,
      minimumVersion:
        typeof body.minimumVersion === "string" && body.minimumVersion.trim().length > 0
          ? body.minimumVersion.trim()
          : null,
      reward:
        typeof body.reward === "string" && body.reward.trim().length > 0
          ? body.reward.trim()
          : null,
      cueType: cueType,
      isKeystone: body.isKeystone === true,
      color: body.color,
      displayOrder: maxOrder + 1,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
