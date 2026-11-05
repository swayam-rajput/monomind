import type { RawNotePayload } from "@monomind/types";

/**
 * Prompt + validation for Phase 4's note generation. Kept in @monomind/ai
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

  return `Extract key information from this conversation and format it as JSON.

Conversation Title: "${title}"

Conversation Content:
${transcript}

You must analyze the above conversation and create a structured summary. Focus only on what was actually discussed.

Output the result as a JSON object with this exact structure:

{
  "title": null,
  "summary": "Write 2-4 sentences summarizing the main points of the conversation",
  "topics": ["topic1", "topic2", "topic3"],
  "keyIdeas": ["idea1", "idea2"],
  "decisions": ["decision1", "decision2"],
  "openQuestions": ["question1", "question2"]
}

Instructions:
- title: Only provide a new title if "${title}" needs improvement, otherwise use null
- summary: Concise summary in 2-4 sentences based only on the conversation content
- topics: 3-8 topic labels that describe what was discussed
- keyIdeas: Important insights or concepts mentioned (use empty array [] if none)
- decisions: Concrete decisions or conclusions reached (use empty array [] if none)
- openQuestions: Unresolved questions or items for follow-up (use empty array [] if none)

Respond with only the JSON object - no explanations, no markdown formatting, no additional text.`;
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
  } catch (jsonError) {
    // Log the problematic response for debugging
    console.error("JSON parsing failed. Raw response:", rawResponse);
    console.error("Extracted JSON text:", jsonText);
    throw new NotePayloadError("Model response was not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    console.error("Parsed response is not an object:", parsed);
    throw new NotePayloadError("Model response was not a JSON object.");
  }

  const p = parsed as Record<string, unknown>;

  if (typeof p.summary !== "string" || p.summary.trim().length === 0) {
    console.error("Invalid summary field:", p.summary);
    throw new NotePayloadError("Missing or empty 'summary' field.");
  }
  if (!isStringArray(p.topics)) {
    console.error("Invalid topics field:", p.topics);
    throw new NotePayloadError("'topics' must be an array of strings.");
  }
  if (!isStringArray(p.keyIdeas)) {
    console.error("Invalid keyIdeas field:", p.keyIdeas);
    throw new NotePayloadError("'keyIdeas' must be an array of strings.");
  }
  if (!isStringArray(p.decisions)) {
    console.error("Invalid decisions field:", p.decisions);
    throw new NotePayloadError("'decisions' must be an array of strings.");
  }
  if (!isStringArray(p.openQuestions)) {
    console.error("Invalid openQuestions field:", p.openQuestions);
    throw new NotePayloadError("'openQuestions' must be an array of strings.");
  }
  if (p.title !== null && typeof p.title !== "string") {
    console.error("Invalid title field:", p.title);
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
  
  if (!trimmed) {
    throw new Error("Response is completely empty");
  }
  
  // Handle common markdown fence patterns
  const fencedPatterns = [
    /^```json\s*\n([\s\S]*?)\n\s*```$/,
    /^```\s*\n([\s\S]*?)\n\s*```$/,
    /^`([^`]*)`$/
  ];
  
  for (const pattern of fencedPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const content = match[1].trim();
      if (content.startsWith("{") && content.includes("}")) {
        return content;
      }
    }
  }
  
  // If already clean JSON, return as-is
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  // Extract JSON object with better boundary detection
  // This handles nested objects and arrays properly
  let braceCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '{') {
      if (startIndex === -1) startIndex = i;
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    return trimmed.substring(startIndex, endIndex + 1);
  }

  // Handle cases where there's text before/after the JSON (fallback)
  const boundaryMatch = trimmed.match(/.*?(\{[\s\S]*\}).*/);
  if (boundaryMatch && boundaryMatch[1]) {
    return boundaryMatch[1];
  }

  // Last resort: return the trimmed text and let JSON.parse fail with a better error
  return trimmed;
}
