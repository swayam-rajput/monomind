import { prisma } from "@monome/db";
import { getActiveProvider, buildNotePrompt, parseNotePayload, NotePayloadError, type LLMProvider } from "@monome/ai";

/**
 * Generates a structured Note for one conversation by calling
 * provider.chat() with a JSON-schema prompt, validating the response, and
 * storing it in SQLite. Always sets conversationId from the function
 * argument (never from anything the model returns), so a note can never
 * exist without a traceable, guaranteed-correct source.
 *
 * On malformed JSON (or a shape that fails validation), retries the exact
 * same prompt once. If it fails again, the conversation is skipped - this
 * function returns a result object rather than throwing, so a batch loop
 * can continue to the next conversation without special-casing errors.
 *
 * Safe to re-run: an existing note for the conversation is updated in
 * place rather than duplicated.
 */
export async function generateNoteForConversation(
  conversationId: string,
  provider: LLMProvider = getActiveProvider()
): Promise<{ ok: true; noteId: string } | { ok: false; error: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return { ok: false, error: `Conversation ${conversationId} not found.` };
  }
  if (conversation.messages.length === 0) {
    return { ok: false, error: "Conversation has no messages to summarize." };
  }

  const prompt = buildNotePrompt(
    conversation.title,
    conversation.messages.map((m) => ({ role: m.role, content: m.content }))
  );

  const payload = await requestNotePayload(prompt, provider);
  if (!payload.ok) {
    return { ok: false, error: payload.error };
  }

  const existing = await prisma.note.findFirst({ where: { conversationId }, select: { id: true } });

  const data = {
    titleOverride: payload.value.title,
    summary: payload.value.summary,
    topics: JSON.stringify(clampTopics(payload.value.topics)),
    keyIdeas: JSON.stringify(payload.value.keyIdeas),
    decisions: JSON.stringify(payload.value.decisions),
    openQuestions: JSON.stringify(payload.value.openQuestions),
  };

  const note = existing
    ? await prisma.note.update({ where: { id: existing.id }, data })
    : await prisma.note.create({ data: { conversationId, ...data } });

  return { ok: true, noteId: note.id };
}

/**
 * Calls provider.chat() with the given prompt and validates the JSON
 * response, retrying once on failure before giving up.
 */
async function requestNotePayload(
  prompt: string,
  provider: LLMProvider
): Promise<{ ok: true; value: ReturnType<typeof parseNotePayload> } | { ok: false; error: string }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await provider.chat(prompt);
      const payload = parseNotePayload(response);
      return { ok: true, value: payload };
    } catch (err) {
      const isLastAttempt = attempt === 2;
      const isPayloadError = err instanceof NotePayloadError;

      if (isLastAttempt) {
        const reason = err instanceof Error ? err.message : "Unknown error generating note.";
        return {
          ok: false,
          error: isPayloadError
            ? `Model returned invalid JSON after retry: ${reason}`
            : `Chat call failed: ${reason}`,
        };
      }
      // First attempt failed - fall through to retry with the same prompt.
    }
  }
  // Unreachable, but keeps TypeScript happy about the loop's return type.
  return { ok: false, error: "Unknown error generating note." };
}

/** Keeps topic count within the requested 3-8 range without discarding the note over it. */
function clampTopics(topics: string[]): string[] {
  if (topics.length <= 8) return topics;
  return topics.slice(0, 8);
}
