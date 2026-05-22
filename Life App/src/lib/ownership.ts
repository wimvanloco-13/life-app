import { db } from "@/db";
import { roles, goals, activityTypes } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export class OwnershipError extends Error {
  constructor(public field: string) {
    super(`${field} does not belong to the current user`);
  }
}

/**
 * Validates that all supplied IDs belong to userId.
 * Throws OwnershipError (→ caller returns 403) on any mismatch.
 *
 * Accepts both singular and plural forms:
 *   - Singular: goalId, activityTypeId (for single-write routes)
 *   - Plural: roleIds[], goalIds[], activityTypeIds[] (for batch routes like schedule/apply)
 *
 * parentGoalId additionally enforces horizon === "yearly" (returns 400 via a
 * separate ParentGoalTypeError if the parent is not a yearly goal).
 *
 * Each ID type is validated in a single WHERE id IN (...) AND userId = ?
 * query — not one query per ID.
 */
export async function assertOwnership(
  userId: string,
  opts: {
    roleIds?: number[];
    goalId?: number | null;
    goalIds?: number[];
    parentGoalId?: number | null;
    activityTypeId?: number | null;
    activityTypeIds?: number[];
  }
): Promise<void> {
  const {
    roleIds,
    goalId,
    goalIds,
    parentGoalId,
    activityTypeId,
    activityTypeIds,
  } = opts;

  // --- roles ---
  const allRoleIds = [
    ...(roleIds ?? []),
  ].filter((id): id is number => id != null);

  if (allRoleIds.length > 0) {
    const found = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(inArray(roles.id, allRoleIds), eq(roles.userId, userId)));
    if (found.length !== allRoleIds.length) {
      throw new OwnershipError("roleId");
    }
  }

  // --- goals (singular + plural, excluding parentGoalId which is separate) ---
  const allGoalIds = [
    ...(goalIds ?? []),
    ...(goalId != null ? [goalId] : []),
  ].filter((id): id is number => id != null);

  if (allGoalIds.length > 0) {
    const found = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(inArray(goals.id, allGoalIds), eq(goals.userId, userId)));
    if (found.length !== allGoalIds.length) {
      throw new OwnershipError("goalId");
    }
  }

  // --- parentGoalId: ownership + horizon === "yearly" ---
  if (parentGoalId != null) {
    const found = await db
      .select({ id: goals.id, horizon: goals.horizon })
      .from(goals)
      .where(and(eq(goals.id, parentGoalId), eq(goals.userId, userId)));
    if (found.length === 0) {
      throw new OwnershipError("parentGoalId");
    }
    if (found[0].horizon !== "yearly") {
      throw new ParentGoalTypeError();
    }
  }

  // --- activityTypes (singular + plural) ---
  const allActivityTypeIds = [
    ...(activityTypeIds ?? []),
    ...(activityTypeId != null ? [activityTypeId] : []),
  ].filter((id): id is number => id != null);

  if (allActivityTypeIds.length > 0) {
    const found = await db
      .select({ id: activityTypes.id })
      .from(activityTypes)
      .where(
        and(
          inArray(activityTypes.id, allActivityTypeIds),
          eq(activityTypes.userId, userId)
        )
      );
    if (found.length !== allActivityTypeIds.length) {
      throw new OwnershipError("activityTypeId");
    }
  }
}

/** Thrown when parentGoalId exists and belongs to the user but is not a yearly goal. */
export class ParentGoalTypeError extends Error {
  constructor() {
    super("parentGoalId must reference a yearly goal");
  }
}
