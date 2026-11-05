/**
 * Parses the JSON-encoded string arrays stored in a Note row (topics,
 * keyIdeas, decisions, openQuestions). SQLite has no native array type, so
 * these are stored as JSON strings and parsed on read.
 *
 * A malformed row (partial write, bad model payload that slipped past
 * validation, hand-edited data) would throw from JSON.parse and take the
 * whole page down. This helper falls back to an empty array instead, since
 * an empty list is strictly better than a 500 on a page the user is just
 * viewing. The source of truth for "is this note valid" is the write path,
 * not the read path.
 */
export function parseNoteField(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}