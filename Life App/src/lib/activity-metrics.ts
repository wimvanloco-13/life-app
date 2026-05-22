/**
 * Safely parses a JSON metrics string stored on activity log rows.
 * Returns an empty object on null input or malformed JSON so a single
 * corrupt row never crashes the entire list response.
 */
export function safeParseMetrics(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
