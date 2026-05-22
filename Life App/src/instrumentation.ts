/**
 * Next.js instrumentation hook — runs once per server process on startup.
 * This is the automated backup trigger, replacing the previous approach of
 * calling runDailyBackup() from GET /api/health (which was unauthenticated).
 *
 * The once-per-process guard inside runDailyBackup() handles deduplication;
 * the setInterval re-arms it every 24 hours for long-running processes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runDailyBackup } = await import("@/db/backup");
    runDailyBackup();
    setInterval(runDailyBackup, 24 * 60 * 60 * 1000);
  }
}
