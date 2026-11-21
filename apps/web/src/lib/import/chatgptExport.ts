import type { ParsedConversation, ParsedMessage, MessageRole } from "@monome/types";

/**
 * Parser for ChatGPT's official export format (conversations.json).
 *
 * The exported file is a JSON ARRAY of conversation objects. Each
 * conversation stores its messages as a tree (`mapping`: nodeId -> node),
 * not a flat list, because editing a prompt or regenerating a response
 * forks the conversation into sibling branches. `current_node` points at
 * the leaf of whichever branch is currently "active" (what you'd see if
 * you reopened the chat in the UI).
 *
 * To get the linear conversation as you actually experienced it, we walk
 * parent pointers from `current_node` back to the root, then reverse.
 * This intentionally discards abandoned edit/regenerate branches.
 */

interface RawMappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message: RawMessageNode | null;
}

interface RawMessageNode {
  id: string;
  author: { role: string; name: string | null } | null;
  create_time: number | null;
  content: {
    content_type?: string;
    parts?: Array<string | Record<string, unknown>>;
    text?: string;
  } | null;
}

interface RawConversationExport {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number;
  current_node?: string;
  mapping?: Record<string, RawMappingNode>;
}

/** Thrown for a single conversation that can't be parsed; caller catches and records a warning. */
export class ConversationParseError extends Error {}

/**
 * Parses the top-level conversations.json content (a JSON array) into
 * ParsedConversation objects. Does not throw for individual bad entries;
 * instead returns them separately as skipped, with a reason, so one bad
 * conversation never aborts the whole import.
 */
export function parseChatgptExportFile(fileContents: string): {
  parsed: ParsedConversation[];
  skipped: { identifier: string; reason: string }[];
} {
  let raw: unknown;
  try {
    raw = JSON.parse(fileContents);
  } catch {
    throw new ConversationParseError(
      "conversations.json is not valid JSON. Is this really a ChatGPT export?"
    );
  }

  if (!Array.isArray(raw)) {
    throw new ConversationParseError(
      "conversations.json did not contain a top-level array. This doesn't look like a ChatGPT export."
    );
  }

  const parsed: ParsedConversation[] = [];
  const skipped: { identifier: string; reason: string }[] = [];

  raw.forEach((entry, index) => {
    const identifier =
      (typeof entry === "object" && entry !== null && "title" in entry && typeof (entry as { title?: unknown }).title === "string"
        ? (entry as { title: string }).title
        : null) ?? `conversation #${index + 1}`;

    try {
      const conversation = parseSingleChatgptConversation(entry);
      parsed.push(conversation);
    } catch (err) {
      skipped.push({
        identifier,
        reason: err instanceof Error ? err.message : "Unknown parse error",
      });
    }
  });

  return { parsed, skipped };
}

/** Parses a single conversation object from the export's top-level array. */
export function parseSingleChatgptConversation(entry: unknown): ParsedConversation {
  if (typeof entry !== "object" || entry === null) {
    throw new ConversationParseError("Entry is not an object.");
  }

  const conv = entry as RawConversationExport;

  if (!conv.mapping || typeof conv.mapping !== "object") {
    throw new ConversationParseError("Missing or invalid 'mapping' field.");
  }
  if (!conv.current_node || !conv.mapping[conv.current_node]) {
    throw new ConversationParseError("'current_node' is missing or not found in mapping.");
  }

  const linearNodes = walkActiveBranch(conv.mapping, conv.current_node);

  const messages: ParsedMessage[] = [];
  for (const node of linearNodes) {
    const msg = extractMessage(node, conv.create_time ?? null);
    if (msg) messages.push(msg);
  }

  if (messages.length === 0) {
    throw new ConversationParseError("No usable messages found (all nodes were empty, system-only, or unreadable).");
  }

  return {
    title: conv.title?.trim() || "Untitled conversation",
    source: "chatgpt-export",
    messages,
  };
}

/**
 * Walks parent pointers from `current_node` back to the root, then
 * reverses, producing the linear list of nodes the user actually saw.
 */
function walkActiveBranch(
  mapping: Record<string, RawMappingNode>,
  currentNodeId: string
): RawMappingNode[] {
  const chain: RawMappingNode[] = [];
  let cursor: string | null = currentNodeId;
  const visited = new Set<string>();

  while (cursor !== null) {
    const currentId: string = cursor;
    if (visited.has(currentId)) {
      // Cycle in the mapping graph - shouldn't happen in real exports, but
      // bail out rather than looping forever.
      break;
    }
    visited.add(currentId);

    const node: RawMappingNode | undefined = mapping[currentId];
    if (!node) break;

    chain.push(node);
    cursor = node.parent;
  }

  return chain.reverse();
}

/**
 * Extracts a usable ParsedMessage from a mapping node, or returns null if
 * the node has no message, no visible text, or an unmappable role.
 */
function extractMessage(node: RawMappingNode, fallbackCreateTime: number | null): ParsedMessage | null {
  const message = node.message;
  if (!message || !message.author) return null;

  const role = mapRole(message.author.role);
  if (!role) return null;

  const text = extractText(message.content);
  if (!text || text.trim().length === 0) return null;

  const createTime = message.create_time ?? fallbackCreateTime;

  return {
    role,
    content: text,
    createdAt: createTime ? new Date(createTime * 1000).toISOString() : null,
  };
}

/**
 * Maps ChatGPT's author roles onto our schema's roles. "tool" (browser,
 * python, dalle, etc.) is folded into "system" since it's plumbing, not
 * conversational content from the user or the model directly.
 */
function mapRole(rawRole: string): MessageRole | null {
  switch (rawRole) {
    case "user":
      return "user";
    case "assistant":
      return "assistant";
    case "system":
    case "tool":
      return "system";
    default:
      return null;
  }
}

/**
 * Extracts readable text from a message's content object. Text usually
 * lives in `content.parts` (an array that may mix strings with non-text
 * objects like image pointers); some content types put it in `content.text`
 * instead. Returns null if nothing readable is found.
 */
function extractText(content: RawMessageNode["content"]): string | null {
  if (!content) return null;

  if (Array.isArray(content.parts)) {
    const textParts = content.parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    if (textParts.length > 0) return textParts.join("\n\n");
  }

  if (typeof content.text === "string" && content.text.trim().length > 0) {
    return content.text;
  }

  return null;
}
