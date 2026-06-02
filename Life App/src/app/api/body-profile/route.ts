import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userBodyProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { UserBodyProfile } from "@/types";

function defaultProfile(userId: string): UserBodyProfile {
  return {
    id: null,
    userId,
    dateOfBirth: null,
    biologicalSex: null,
    heightCm: null,
    waistCm: null,
    waistCmUpdatedAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

function rowToProfile(row: typeof userBodyProfiles.$inferSelect): UserBodyProfile {
  return {
    id: row.id,
    userId: row.userId,
    dateOfBirth: row.dateOfBirth ?? null,
    biologicalSex: (row.biologicalSex as "male" | "female" | null) ?? null,
    heightCm: row.heightCm ?? null,
    waistCm: row.waistCm ?? null,
    waistCmUpdatedAt: row.waistCmUpdatedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(userBodyProfiles)
    .where(eq(userBodyProfiles.userId, session.user.id));

  if (rows.length === 0) return NextResponse.json(defaultProfile(session.user.id));
  return NextResponse.json(rowToProfile(rows[0]!));
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  // ── Validate only the fields that are present in the payload ──────────────
  if (body.dateOfBirth !== undefined && body.dateOfBirth !== null) {
    const dob = String(body.dateOfBirth);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(Date.parse(dob))) {
      return NextResponse.json({ error: "Date of birth must be a valid date" }, { status: 400 });
    }
    if (dob > now.slice(0, 10)) {
      return NextResponse.json({ error: "Date of birth cannot be in the future" }, { status: 400 });
    }
  }

  if (body.biologicalSex !== undefined && body.biologicalSex !== null) {
    if (body.biologicalSex !== "male" && body.biologicalSex !== "female") {
      return NextResponse.json({ error: "Biological sex must be 'male' or 'female'" }, { status: 400 });
    }
  }

  if (body.heightCm !== undefined && body.heightCm !== null) {
    const h = Number(body.heightCm);
    if (!Number.isFinite(h) || h <= 0) {
      return NextResponse.json({ error: "Height must be a positive number" }, { status: 400 });
    }
  }

  if (body.waistCm !== undefined && body.waistCm !== null) {
    const w = Number(body.waistCm);
    if (!Number.isFinite(w) || w <= 0) {
      return NextResponse.json({ error: "Waist must be a positive number" }, { status: 400 });
    }
  }

  // ── Build the update payload ──────────────────────────────────────────────
  const updates: Partial<typeof userBodyProfiles.$inferInsert> & { updatedAt: string } = {
    updatedAt: now,
  };

  if ("dateOfBirth" in body) updates.dateOfBirth = body.dateOfBirth != null ? String(body.dateOfBirth) : null;
  if ("biologicalSex" in body) updates.biologicalSex = body.biologicalSex != null ? String(body.biologicalSex) : null;
  if ("heightCm" in body) updates.heightCm = body.heightCm != null ? Number(body.heightCm) : null;
  if ("waistCm" in body) {
    updates.waistCm = body.waistCm != null ? Number(body.waistCm) : null;
    updates.waistCmUpdatedAt = body.waistCm != null ? now : null;
  }

  // ── Atomic upsert — eliminates the race condition on first-ever PATCH ────
  const [resultRow] = await db
    .insert(userBodyProfiles)
    .values({
      userId,
      dateOfBirth: updates.dateOfBirth ?? null,
      biologicalSex: updates.biologicalSex ?? null,
      heightCm: updates.heightCm ?? null,
      waistCm: updates.waistCm ?? null,
      waistCmUpdatedAt: updates.waistCmUpdatedAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userBodyProfiles.userId,
      set: {
        ...updates,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning();

  return NextResponse.json(rowToProfile(resultRow!));
}
