/**
 * Parses note array fields. In SQLite they were JSON strings; in Postgres
 * they're native text[] arrays. This handles both for a smooth migration.
 *
 * A malformed row would throw; we fall back to [] rather than 500.
 */
export function parseNoteField(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  // Already a native array (Postgres)
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  // JSON string (legacy SQLite)
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}