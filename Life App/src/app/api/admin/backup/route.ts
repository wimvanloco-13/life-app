import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runDailyBackup } from "@/db/backup";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  runDailyBackup();

  return NextResponse.json({
    ok: true,
    message: "Backup check complete. A new backup was created if one did not already exist for today.",
  });
}
