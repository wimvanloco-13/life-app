import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { momentLogs, spendingEntries, spendingCategories } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { MomentDecision } from "@/types";

const VALID_DECISIONS: MomentDecision[] = ["proceeded", "declined", "parked"];

async function verifyCategoryOwnership(categoryId: number, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: spendingCategories.id })
    .from(spendingCategories)
    .where(and(eq(spendingCategories.id, categoryId), eq(spendingCategories.userId, userId)));
  return rows.length > 0;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { amount, description, date, decision, categoryId, scorecardAnswer, utilityStatusAnswer, sixMonthAnswer, alsoLogAsSpending } = body;

  if (amount == null || Number(amount) <= 0)
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  if (!description || typeof description !== "string" || description.trim().length === 0)
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  if (!VALID_DECISIONS.includes(decision))
    return NextResponse.json({ error: "decision must be proceeded, declined, or parked" }, { status: 400 });

  if (categoryId != null) {
    const owned = await verifyCategoryOwnership(Number(categoryId), userId);
    if (!owned) return NextResponse.json({ error: "categoryId does not belong to the current user" }, { status: 403 });
  }

  const created = await db.transaction(async (tx) => {
    let spendingEntryId: number | null = null;

    if (alsoLogAsSpending && decision === "proceeded") {
      const today = new Date().toISOString().slice(0, 10);
      const [spending] = await tx
        .insert(spendingEntries)
        .values({
          amount: Number(amount),
          category: categoryId != null
            ? ((await tx.select({ name: spendingCategories.name }).from(spendingCategories).where(eq(spendingCategories.id, Number(categoryId))))[0]?.name ?? "Other")
            : "Other",
          description: description.trim(),
          date: date ?? today,
          userId,
        })
        .returning();
      spendingEntryId = spending?.id ?? null;
    }

    const [log] = await tx
      .insert(momentLogs)
      .values({
        userId,
        date,
        amount: Number(amount),
        description: description.trim(),
        categoryId: categoryId != null ? Number(categoryId) : null,
        spendingEntryId,
        scorecardAnswer: typeof scorecardAnswer === "string" ? scorecardAnswer.trim() || null : null,
        utilityStatusAnswer: typeof utilityStatusAnswer === "string" ? utilityStatusAnswer.trim() || null : null,
        sixMonthAnswer: typeof sixMonthAnswer === "string" ? sixMonthAnswer.trim() || null : null,
        decision,
      })
      .returning();

    return log;
  });

  return NextResponse.json(created, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0"));
  const decisionFilter = searchParams.get("decision");

  const conditions = [eq(momentLogs.userId, userId)];
  if (decisionFilter && VALID_DECISIONS.includes(decisionFilter as MomentDecision)) {
    conditions.push(eq(momentLogs.decision, decisionFilter));
  }

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(momentLogs)
    .where(and(...conditions));

  const logs = await db
    .select({
      id: momentLogs.id,
      userId: momentLogs.userId,
      date: momentLogs.date,
      amount: momentLogs.amount,
      description: momentLogs.description,
      categoryId: momentLogs.categoryId,
      categoryName: spendingCategories.name,
      spendingEntryId: momentLogs.spendingEntryId,
      scorecardAnswer: momentLogs.scorecardAnswer,
      utilityStatusAnswer: momentLogs.utilityStatusAnswer,
      sixMonthAnswer: momentLogs.sixMonthAnswer,
      decision: momentLogs.decision,
      createdAt: momentLogs.createdAt,
      updatedAt: momentLogs.updatedAt,
    })
    .from(momentLogs)
    .leftJoin(spendingCategories, eq(momentLogs.categoryId, spendingCategories.id))
    .where(and(...conditions))
    .orderBy(desc(momentLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ logs, total: Number(total) });
}
