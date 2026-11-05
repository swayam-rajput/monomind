import type { ParsedConversation, ParsedMessage, MessageRole } from "@monomind/types";
import { ConversationParseError, parseSingleChatgptConversation } from "./chatgptExport";

/**
 * Parser for the "paste a conversation as JSON" fallback on the /import
 * page. Meant for quick manual testing, not bulk import.
 *
 * Accepts two shapes:
 *  1. A simplified shape, easy to hand-write:
 *       { "title": "...", "messages": [{ "role": "user", "content": "..." }, ...] }
 *  2. A single raw ChatGPT export conversation object (same shape as one
 *     entry in conversations.json), in case someone pastes that instead.
 */

interface SimplifiedMessage {
  role: string;
  content: string;
  createdAt?: string;
}

interface SimplifiedConversation {
  title?: string;
  messages: SimplifiedMessage[];
}

export function parsePastedConversation(text: string): ParsedConversation {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ConversationParseError("That's not valid JSON.");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new ConversationParseError("Expected a JSON object.");
  }

  // Shape 1: simplified { title, messages: [{ role, content }] }
  if ("messages" in raw && Array.isArray((raw as SimplifiedConversation).messages)) {
    return parseSimplifiedConversation(raw as SimplifiedConversation);
  }

  // Shape 2: raw ChatGPT export conversation object (has a `mapping` tree).
  if ("mapping" in raw) {
    const conversation = parseSingleChatgptConversation(raw);
    return { ...conversation, source: "pasted" };
  }

  throw new ConversationParseError(
    'Unrecognized shape. Expected either { "title", "messages": [{ "role", "content" }] } or a raw ChatGPT conversation object.'
  );
}

function parseSimplifiedConversation(input: SimplifiedConversation): ParsedConversation {
  if (input.messages.length === 0) {
    throw new ConversationParseError("'messages' array is empty.");
  }

  const messages: ParsedMessage[] = input.messages.map((m, idx) => {
    const role = mapRole(m.role);
    if (!role) {
      throw new ConversationParseError(
        `Message #${idx + 1} has an invalid role "${m.role}" (expected "user", "assistant", or "system").`
      );
    }
    if (typeof m.content !== "string" || m.content.trim().length === 0) {
      throw new ConversationParseError(`Message #${idx + 1} has no content.`);
    }
    return {
      role,
      content: m.content,
      createdAt: m.createdAt ?? null,
    };
  });

  return {
    title: input.title?.trim() || "Untitled conversation",
    source: "pasted",
    messages,
  };
}

function mapRole(rawRole: string): MessageRole | null {
  if (rawRole === "user" || rawRole === "assistant" || rawRole === "system") return rawRole;
  return null;
}
