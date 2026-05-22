import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getOrCreateBudgetSettings(userId: string) {
  const rows = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, userId));
  if (rows.length > 0) return rows[0];

  const [created] = await db.insert(budgetSettings).values({ currency: "EUR", monthlySavingsTarget: 0, userId }).returning();
  return created!;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getOrCreateBudgetSettings(session.user.id);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const settings = await getOrCreateBudgetSettings(userId);
  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.monthlySavingsTarget !== undefined) updates.monthlySavingsTarget = Number(body.monthlySavingsTarget);
  if (body.savingsGoalTotal !== undefined) updates.savingsGoalTotal = body.savingsGoalTotal == null ? null : Number(body.savingsGoalTotal);
  if (body.savingsGoalTargetDate !== undefined) updates.savingsGoalTargetDate = body.savingsGoalTargetDate == null ? null : String(body.savingsGoalTargetDate);
  if (body.savingsStartingBalance !== undefined) updates.savingsStartingBalance = body.savingsStartingBalance == null ? 0 : Number(body.savingsStartingBalance);

  const [updated] = await db.update(budgetSettings).set(updates).where(and(eq(budgetSettings.id, settings.id), eq(budgetSettings.userId, userId))).returning();
  return NextResponse.json(updated);
}
