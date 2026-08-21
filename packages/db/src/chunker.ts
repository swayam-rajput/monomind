/**
 * Splits a conversation's messages into ~500-token chunks, respecting
 * message boundaries: we never cut a single message in half. Instead we
 * greedily pack whole messages into a chunk until adding the next one
 * would push it over the token budget, then start a new chunk.
 *
 * Exception: a single message that's larger than the whole budget on its
 * own (a long pasted document, a big code block) gets its own chunk rather
 * than being split, since splitting mid-message would produce embeddings
 * for sentence fragments with no clean boundary logic. This trades a
 * slightly oversized chunk for not mangling a message.
 *
 * Token counting is approximate: chars/4 is a well-known rough estimate
 * for English text and code. Good enough for chunk sizing, not used for
 * anything billing-sensitive.
 */

export interface MessageForChunking {
  id: string;
  content: string;
}

export interface ChunkResult {
  order: number;
  text: string;
  startMessageId: string;
  endMessageId: string;
  tokenEstimate: number;
}

const TARGET_TOKENS_PER_CHUNK = 500;
const CHARS_PER_TOKEN_ESTIMATE = 4;
const TARGET_CHARS_PER_CHUNK = TARGET_TOKENS_PER_CHUNK * CHARS_PER_TOKEN_ESTIMATE;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function chunkMessages(messages: MessageForChunking[]): ChunkResult[] {
  const chunks: ChunkResult[] = [];

  let currentMessages: MessageForChunking[] = [];
  let currentChars = 0;

  const flush = () => {
    if (currentMessages.length === 0) return;
    const text = currentMessages.map((m) => m.content).join("\n\n");
    chunks.push({
      order: chunks.length,
      text,
      startMessageId: currentMessages[0].id,
      endMessageId: currentMessages[currentMessages.length - 1].id,
      tokenEstimate: estimateTokens(text),
    });
    currentMessages = [];
    currentChars = 0;
  };

  for (const message of messages) {
    const messageChars = message.content.length;

    // Adding this message would overflow the budget, and we already have
    // something queued up - close out the current chunk first.
    if (currentMessages.length > 0 && currentChars + messageChars > TARGET_CHARS_PER_CHUNK) {
      flush();
    }

    currentMessages.push(message);
    currentChars += messageChars;

    // A single message that's already over budget gets its own chunk
    // immediately, rather than accumulating more onto it.
    if (currentChars > TARGET_CHARS_PER_CHUNK) {
      flush();
    }
  }

  flush();

  return chunks;
}
