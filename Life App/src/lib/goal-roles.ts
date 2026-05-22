import { db } from "@/db";
import { goalRoles, roles } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export type RoleStub = { id: number; name: string; color: string };

/**
 * Fetches role stubs for a set of goal IDs, scoped to userId.
 * Returns a Map<goalId, RoleStub[]>.
 *
 * The userId filter ensures cross-user role data never leaks even if
 * goalRoles rows somehow reference roles from another tenant.
 */
export async function attachRoles(
  goalIds: number[],
  userId: string
): Promise<Map<number, RoleStub[]>> {
  if (goalIds.length === 0) return new Map();

  const rows = await db
    .select({
      goalId: goalRoles.goalId,
      roleId: roles.id,
      roleName: roles.name,
      roleColor: roles.color,
    })
    .from(goalRoles)
    .innerJoin(roles, eq(goalRoles.roleId, roles.id))
    .where(
      and(inArray(goalRoles.goalId, goalIds), eq(roles.userId, userId))
    );

  const map = new Map<number, RoleStub[]>();
  for (const row of rows) {
    const arr = map.get(row.goalId) ?? [];
    arr.push({ id: row.roleId, name: row.roleName, color: row.roleColor });
    map.set(row.goalId, arr);
  }
  return map;
}
