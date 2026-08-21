import type { RawNotePayload } from "@monome/types";

/**
 * Prompt + validation for Phase 4's note generation. Kept in @monome/ai
 * (not the web app) since it's tightly coupled to "what we ask the model
 * for and how we check its answer," not to any UI concern.
 */

/** Roughly caps how much conversation text we send, to stay within a local model's context window. */
const MAX_TRANSCRIPT_CHARS = 12000;

export interface MessageForPrompt {
  role: string;
  content: string;
}

/**
 * Builds the transcript text embedded in the prompt. If the conversation
 * is too long, keeps the first few and last many messages (decisions and
 * conclusions tend to land near the end) rather than truncating blindly
 * from one side.
 */
export function buildTranscript(messages: MessageForPrompt[]): string {
  const full = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  if (full.length <= MAX_TRANSCRIPT_CHARS) return full;

  const headCount = Math.min(3, messages.length);
  const head = messages.slice(0, headCount);
  const tail: MessageForPrompt[] = [];
  let tailChars = 0;
  // Walk backwards from the end, keeping whole messages until we run out
  // of budget - favors the tail since conclusions/decisions usually land
  // near the end of a conversation.
  for (let i = messages.length - 1; i >= headCount; i--) {
    const m = messages[i];
    if (tailChars + m.content.length > MAX_TRANSCRIPT_CHARS) break;
    tail.unshift(m);
    tailChars += m.content.length;
  }

  const headText = head.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  const tailText = tail.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  return `${headText}\n\n[... conversation truncated for length ...]\n\n${tailText}`;
}

export function buildNotePrompt(title: string, messages: MessageForPrompt[]): string {
  const transcript = buildTranscript(messages);

  return `You are analyzing a personal conversation log to extract a structured note.
Only use information present in the conversation below. Do not invent facts,
opinions, or conclusions that are not actually stated or clearly implied by
the conversation.

Conversation title: "${title}"

Conversation:
${transcript}

Respond with ONLY a JSON object matching this exact shape, no markdown
fences, no commentary:

{
  "title": string or null,   // a better short title, or null if "${title}" is already fine
  "summary": string,         // 2-4 sentences, grounded only in the conversation above
  "topics": string[],        // 3-8 short topic labels
  "keyIdeas": string[],      // notable ideas discussed; empty array if none
  "decisions": string[],     // decisions made or conclusions reached; empty array if none
  "openQuestions": string[]  // unresolved questions raised; empty array if none
}`;
}

export class NotePayloadError extends Error {}

/**
 * Parses and validates a chat model's raw text response against the note
 * schema. Throws NotePayloadError on anything wrong - the caller is
 * expected to retry once, then skip and log.
 *
 * Deliberately lenient on `topics` count (3-8 is a guideline, not a hard
 * gate) since discarding an otherwise-good note over a count technicality
 * would be worse than just using what the model gave us.
 */
export function parseNotePayload(rawResponse: string): RawNotePayload {
  const jsonText = extractJsonObject(rawResponse);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new NotePayloadError("Model response was not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new NotePayloadError("Model response was not a JSON object.");
  }

  const p = parsed as Record<string, unknown>;

  if (typeof p.summary !== "string" || p.summary.trim().length === 0) {
    throw new NotePayloadError("Missing or empty 'summary' field.");
  }
  if (!isStringArray(p.topics)) {
    throw new NotePayloadError("'topics' must be an array of strings.");
  }
  if (!isStringArray(p.keyIdeas)) {
    throw new NotePayloadError("'keyIdeas' must be an array of strings.");
  }
  if (!isStringArray(p.decisions)) {
    throw new NotePayloadError("'decisions' must be an array of strings.");
  }
  if (!isStringArray(p.openQuestions)) {
    throw new NotePayloadError("'openQuestions' must be an array of strings.");
  }
  if (p.title !== null && typeof p.title !== "string") {
    throw new NotePayloadError("'title' must be a string or null.");
  }

  return {
    title: (p.title as string | null) ?? null,
    summary: p.summary,
    topics: p.topics as string[],
    keyIdeas: p.keyIdeas as string[],
    decisions: p.decisions as string[],
    openQuestions: p.openQuestions as string[],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Models sometimes wrap JSON in markdown fences or add stray text around
 * it despite instructions not to. Extracts the first {...} block as a
 * best-effort fallback before giving up.
 */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return match[0];

  return trimmed;
}
